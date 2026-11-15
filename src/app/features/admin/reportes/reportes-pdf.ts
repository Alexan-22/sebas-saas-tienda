import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  crearReporteCsv,
  ContextoCsv,
  DatosCsvTienda,
  TablaCsv,
  TipoReporteCsv,
} from './reportes-csv';
import { fechaLima } from '../../../shared/export/fecha-lima';
import { CeldaCsv } from '../../../shared/export/csv-export';

/** Documento local: solo recibe el conjunto devuelto por las API autenticadas de tienda. */
export function crearReportePdf(
  datos: DatosCsvTienda,
  contexto: ContextoCsv,
  tienda: string,
): jsPDF {
  // Las mismas proyecciones que CSV validan fechas, moneda y relaciones antes de crear el archivo.
  const tabla = (tipo: TipoReporteCsv): TablaCsv => {
    const t = crearReporteCsv(tipo, datos, contexto);
    return { cabeceras: t.cabeceras.slice(0, -5), filas: t.filas.map((f) => f.slice(0, -5)) };
  };
  const ventas = tabla('resumen_ventas'),
    medios = tabla('medios_pago'),
    canales = tabla('canales');
  const productos = tabla('productos_vendidos'),
    clientes = tabla('clientes'),
    cuentas = tabla('clientes_cuentas');
  const inventario = tabla('inventario');
  // Agregación de categorías con moneda explícita; jamás sumar monedas ausentes o diferentes.
  const categorias = new Map<
    string,
    { nombre: string; moneda: string; unidades: number; centimos: number }
  >();
  for (const fila of productos.filas) {
    const nombre = String(fila[2]),
      moneda = String(fila[3]),
      key = JSON.stringify([nombre, moneda]);
    const grupo = categorias.get(key) ?? { nombre, moneda, unidades: 0, centimos: 0 };
    grupo.unidades += Number(fila[4]);
    if (moneda !== 'NO_INFORMADA') grupo.centimos += Math.round(Number(fila[5]) * 100);
    if (!Number.isSafeInteger(grupo.unidades) || !Number.isSafeInteger(grupo.centimos))
      throw Error('Total de categoría fuera de rango.');
    categorias.set(key, grupo);
  }
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ancho = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(124, 58, 237);
  pdf.rect(0, 0, ancho, 34, 'F');
  pdf.setTextColor(255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text(tienda.slice(0, 45), 14, 15);
  pdf.setFontSize(9);
  pdf.text('REPORTE DE VENTAS REGISTRADAS E INDICADORES', 14, 24);
  pdf.setTextColor(0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Periodo: ' + contexto.periodo + ' | America/Lima', 14, 42);
  pdf.text(
    'Generado: ' +
      fechaLima(contexto.generadoEn) +
      ' | Consulta: ' +
      fechaLima(contexto.consultadoEn),
    14,
    48,
  );
  const aviso =
    'Importes de pedidos registrados: no acreditan pagos ni cobros confirmados. Sin moneda informada, el total monetario no se calcula. Inventario y cuentas son actuales, no historicos del periodo.';
  const lineas = pdf.splitTextToSize(aviso, ancho - 28);
  pdf.text(lineas, 14, 55);
  let y = 59 + lineas.length * 4;
  const seccion = (titulo: string, t: TablaCsv) => {
    if (y > 240) {
      pdf.addPage();
      y = 20;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(titulo, 14, y);
    const formatear = (v: CeldaCsv, i: number): string => {
      if (v == null) return '';
      if (v === 'TOTAL_NO_CALCULADO_SIN_MONEDA') return 'Sin moneda: total no calculado';
      if (v === 'SUMA_DE_IMPORTES_REGISTRADOS') return 'Importe registrado';
      return typeof v === 'number' && /Importe|Precio|Subtotal/.test(t.cabeceras[i])
        ? v.toFixed(2)
        : String(v);
    };
    autoTable(pdf, {
      startY: y + 5,
      head: [t.cabeceras],
      body: t.filas.map((f) => f.map(formatear)),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [124, 58, 237], textColor: 255 },
      margin: { left: 14, right: 14, bottom: 20 },
    });
    y =
      ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 10) +
      12;
    if (!t.filas.length) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text('Sin registros para el criterio indicado.', 14, y);
      y += 10;
    }
  };
  seccion('VENTAS REGISTRADAS POR MONEDA', ventas);
  seccion('VENTAS REGISTRADAS POR MEDIO DE PAGO', medios);
  seccion('VENTAS REGISTRADAS POR CANAL INFORMADO', canales);
  seccion('PRODUCTOS VENDIDOS (SIN ENVIO)', productos);
  seccion('VENTAS POR CATEGORIA (SIN ENVIO)', {
    cabeceras: ['Categoria', 'Moneda', 'Unidades', 'Importe registrado'],
    filas: [...categorias.values()].map((c) => [
      c.nombre,
      c.moneda,
      c.unidades,
      c.moneda === 'NO_INFORMADA' ? null : c.centimos / 100,
    ]),
  });
  seccion('INVENTARIO ACTUAL A LA FECHA DE CONSULTA', inventario);
  seccion('ACTIVIDAD DE CLIENTES DEL PERIODO', clientes);
  seccion('CUENTAS DE CLIENTES ACTUALES', {
    cabeceras: ['Cuentas de clientes', 'Activas', 'Inactivas'],
    filas: [
      [
        cuentas.filas.length,
        cuentas.filas.filter((f) => f[1] === 'SI').length,
        cuentas.filas.filter((f) => f[1] === 'NO').length,
      ],
    ],
  });
  const total = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    pdf.setPage(pagina);
    const alto = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(220);
    pdf.line(14, alto - 14, ancho - 14, alto - 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100);
    pdf.text((tienda + ' - Reporte administrativo').slice(0, 85), 14, alto - 8);
    pdf.text('Pagina ' + pagina + ' de ' + total, ancho - 14, alto - 8, { align: 'right' });
  }
  return pdf;
}
