import { crearReportePdf } from './reportes-pdf';
import { contextoFicticio, datosFicticios } from './testing/reportes.fixture';

describe('PDF de Reportes: documento real con datos ficticios', () => {
  it('genera un PDF multipagina valido, con Lima y ventas registradas sin atribuir cobros', () => {
    const doc = crearReportePdf(datosFicticios(), contextoFicticio(), 'Boutique ficticia A');
    const pdf = doc.output();
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('%%EOF');
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    for (const texto of [
      'Boutique ficticia A',
      'America/Lima',
      '2026-11-13 23:30:00',
      'VENTAS REGISTRADAS',
      'no acreditan pagos ni cobros confirmados',
      'Pagina 1 de',
    ])
      expect(pdf).toContain(texto);
  });
  it('aplica el periodo a ventas y productos sin arrastrar detalles huerfanos ni PII', () => {
    const d = datosFicticios();
    d.detalles[2] = {
      ...d.detalles[2],
      productoTalla: {
        ...d.detalles[2].productoTalla,
        producto: { ...d.detalles[2].productoTalla.producto, nombre: 'PRODUCTO_FUERA_PERIODO' },
      },
    };
    const pdf = crearReportePdf(d, contextoFicticio(), 'Boutique ficticia A').output();
    for (const texto of [
      'PRODUCTO_FUERA_PERIODO',
      'TENANT_B_NO_EXPORTAR',
      'privado@example',
      'NO_EXPORTAR',
      'passwordHash',
      'verificadoPor',
    ])
      expect(pdf).not.toContain(texto);
    expect(pdf).toContain('0.30');
    expect(pdf).not.toContain('(USD)');
  });
  it('separa monedas, no presupone soles y no suma cantidades sin moneda', () => {
    const pdf = crearReportePdf(
      datosFicticios(),
      contextoFicticio('TODO'),
      'Boutique ficticia A',
    ).output();
    for (const texto of ['PEN', 'USD', 'NO_INFORMADA', 'Sin moneda', '12.00'])
      expect(pdf).toContain(texto);
    expect(pdf).not.toContain('S/');
  });
  it('mantiene inventario y cuentas como instantanea actual aunque no haya ventas del periodo', () => {
    const d = datosFicticios();
    d.ventas = [];
    d.detalles = [];
    const pdf = crearReportePdf(d, contextoFicticio(), 'Boutique ficticia A').output();
    expect(pdf).toContain('INVENTARIO ACTUAL');
    expect(pdf).toContain('CUENTAS DE CLIENTES ACTUALES');
    expect(pdf).toContain('Sin registros para el criterio indicado');
    expect(pdf).not.toContain('privado@example');
  });
  it('cada documento usa solo el conjunto de su tienda, aun con IDs locales iguales', () => {
    const a = datosFicticios(),
      b = datosFicticios();
    a.inventario[0].producto.nombre = 'SOLO_A';
    b.inventario[0].producto.nombre = 'SOLO_B';
    const pa = crearReportePdf(a, contextoFicticio(), 'Boutique ficticia A').output();
    const pb = crearReportePdf(b, contextoFicticio(), 'Boutique ficticia B').output();
    expect(pa).toContain('SOLO_A');
    expect(pa).not.toContain('SOLO_B');
    expect(pb).toContain('SOLO_B');
    expect(pb).not.toContain('SOLO_A');
  });
  it('datos invalidos bloquean el documento sin sustituirlos por ceros', () => {
    const d = datosFicticios();
    d.ventas[0].total = NaN;
    expect(() => crearReportePdf(d, contextoFicticio(), 'Boutique ficticia A')).toThrow();
  });
});
