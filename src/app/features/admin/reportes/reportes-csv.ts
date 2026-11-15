import { Venta, DetalleVenta } from '../../../core/models/venta-detalle';
import { Producto } from '../../../core/models/producto';
import { ProductoTalla } from '../../../core/models/producto-talla';
import { UsuarioAdmin } from '../../../core/models/usuario-admin';
import { PagoYapeManual } from '../../../core/services/yape-pagos.service';
import { PagoTransferencia } from '../../../core/services/transferencias.service';
import { CobroContraEntrega } from '../../../core/services/contraentrega';
import { CeldaCsv } from '../../../shared/export/csv-export';
import {
  enPeriodo,
  fechaHoraLima,
  fechaLima,
  ZONA_REPORTE,
  PERIODOS_REPORTE,
} from '../../../shared/export/fecha-lima';
export const REPORTES_CSV = [
  ['ventas', 'Ventas registradas'],
  ['resumen_ventas', 'Totales de ventas por moneda'],
  ['detalles', 'Detalle de ventas (sin envío)'],
  ['productos_vendidos', 'Productos vendidos'],
  ['catalogo', 'Catálogo actual'],
  ['inventario', 'Inventario actual por variante'],
  ['pagos', 'Pagos registrados por fecha de creación'],
  ['cobros', 'Cobros verificados por fecha de verificación'],
  ['resumen_cobros', 'Totales de cobros verificados por moneda'],
  ['medios_pago', 'Ventas registradas por medio de pago'],
  ['canales', 'Ventas registradas por canal'],
  ['clientes', 'Actividad de clientes'],
  ['clientes_cuentas', 'Cuentas de clientes actuales'],
] as const;
export const GRUPOS_REPORTES_CSV = [
  {
    nombre: 'Ventas',
    reportes: REPORTES_CSV.filter((r) =>
      [
        'ventas',
        'resumen_ventas',
        'detalles',
        'productos_vendidos',
        'medios_pago',
        'canales',
      ].includes(r[0]),
    ),
  },
  {
    nombre: 'Inventario',
    reportes: REPORTES_CSV.filter((r) => ['catalogo', 'inventario'].includes(r[0])),
  },
  {
    nombre: 'Pagos',
    reportes: REPORTES_CSV.filter((r) => ['pagos', 'cobros', 'resumen_cobros'].includes(r[0])),
  },
  {
    nombre: 'Clientes',
    reportes: REPORTES_CSV.filter((r) => ['clientes', 'clientes_cuentas'].includes(r[0])),
  },
] as const;
export type TipoReporteCsv = (typeof REPORTES_CSV)[number][0];
export const requierePagos = (tipo: TipoReporteCsv) =>
  ['pagos', 'cobros', 'resumen_cobros'].includes(tipo);
export interface DatosCsvTienda {
  ventas: Venta[];
  detalles: DetalleVenta[];
  productos: Producto[];
  inventario: ProductoTalla[];
  usuarios: UsuarioAdmin[];
  yape?: PagoYapeManual[];
  transferencias?: PagoTransferencia[];
  contraentrega?: CobroContraEntrega[];
}
export interface ContextoCsv {
  periodo: string;
  referencia: Date;
  consultadoEn: Date;
  generadoEn: Date;
}
export interface TablaCsv {
  cabeceras: string[];
  filas: CeldaCsv[][];
}
const SIN_MONEDA = 'NO_INFORMADA';
export function monedaCsv(value: object): string {
  const m = (value as { moneda?: unknown }).moneda;
  return typeof m === 'string' && /^[A-Z]{3}$/.test(m) ? m : SIN_MONEDA;
}
export function ventaContabilizable(v: Venta): boolean {
  return ![v.estado, v.estadoPedido].some((s) =>
    ['CANCELADO', 'CANCELADA', 'ANULADO', 'ANULADA'].includes(
      String(s ?? '')
        .trim()
        .toUpperCase(),
    ),
  );
}
function numero(v: unknown): number {
  if (
    (typeof v !== 'number' && typeof v !== 'string') ||
    (typeof v === 'string' && !/^-?\d+(?:\.\d+)?$/.test(v))
  )
    throw Error('Número no válido en los datos del reporte.');
  const n = Number(v);
  if (!Number.isFinite(n)) throw Error('Número no finito.');
  return n;
}
function entero(v: unknown): number {
  const n = numero(v);
  if (!Number.isSafeInteger(n)) throw Error('Cantidad o identificador no válido.');
  return n;
}
function id(v: unknown): number {
  const n = entero(v);
  if (n <= 0) throw Error('Identificador no válido.');
  return n;
}
function centimos(v: unknown): number {
  const n = numero(v),
    c = Math.round(n * 100);
  if (n < 0 || !Number.isSafeInteger(c) || Math.abs(c - n * 100) > 0.00001)
    throw Error('Importe no válido o con más de dos decimales.');
  return c;
}
function total(a: number, b: number): number {
  const n = a + b;
  if (!Number.isSafeInteger(n)) throw Error('Total fuera de rango.');
  return n;
}
function fecha(raw: string): string {
  let f = '';
  try {
    f = fechaHoraLima(raw);
  } catch {}
  if (!f) throw Error('Fecha no válida en los datos del reporte.');
  return f;
}
interface Grupo {
  dimension: CeldaCsv[];
  moneda: string;
  cantidad: number;
  centimos: number;
}
function agrupar(
  items: { dimension: CeldaCsv[]; moneda: string; cantidad: number; importe: number }[],
): CeldaCsv[][] {
  const mapa = new Map<string, Grupo>();
  for (const item of items) {
    const key = JSON.stringify([item.dimension, item.moneda]),
      g = mapa.get(key) ?? {
        dimension: item.dimension,
        moneda: item.moneda,
        cantidad: 0,
        centimos: 0,
      };
    g.cantidad = total(g.cantidad, item.cantidad);
    g.centimos = total(g.centimos, item.importe);
    mapa.set(key, g);
  }
  return [...mapa.values()].map((g) => [
    ...g.dimension,
    g.moneda,
    g.cantidad,
    g.moneda === SIN_MONEDA ? null : g.centimos / 100,
    g.moneda === SIN_MONEDA ? 'TOTAL_NO_CALCULADO_SIN_MONEDA' : 'SUMA_DE_IMPORTES_REGISTRADOS',
  ]);
}
export function crearReporteCsv(tipo: TipoReporteCsv, d: DatosCsvTienda, c: ContextoCsv): TablaCsv {
  if (!PERIODOS_REPORTE.includes(c.periodo as never)) throw Error('Período CSV no reconocido.');
  fechaLima(c.referencia);
  if (!REPORTES_CSV.some((r) => r[0] === tipo)) throw Error('Reporte CSV no reconocido.');
  for (const rows of [d.ventas, d.detalles, d.productos, d.inventario, d.usuarios])
    if (!Array.isArray(rows)) throw Error('Respuesta de reporte incompatible.');
  const all = new Map<number, Venta>();
  for (const v of d.ventas) {
    const key = id(v.idVenta);
    if (all.has(key)) throw Error('Venta duplicada en la respuesta.');
    fecha(v.fechaVenta);
    all.set(key, v);
  }
  const ventas = d.ventas.filter(
    (v) => ventaContabilizable(v) && enPeriodo(v.fechaVenta, c.periodo, c.referencia),
  );
  const ids = new Set(ventas.map((v) => v.idVenta)),
    detalles = d.detalles.filter((v) => ids.has(v.idVenta));
  let cabeceras: string[] = [],
    filas: CeldaCsv[][] = [],
    criterio = 'FECHA_VENTA_LIMA';
  const agrupadas = (dimension: (v: Venta) => CeldaCsv[]) =>
    agrupar(
      ventas.map((v) => ({
        dimension: dimension(v),
        moneda: monedaCsv(v),
        cantidad: 1,
        importe: centimos(v.total),
      })),
    );
  if (tipo === 'ventas') {
    cabeceras = [
      'ID venta',
      'Fecha venta Lima',
      'Canal informado',
      'Estado venta',
      'Estado pedido',
      'Medio de pago',
      'Total pedido registrado',
      'Moneda',
    ];
    filas = ventas.map((v) => [
      id(v.idVenta),
      fecha(v.fechaVenta),
      v.tipoVenta ?? 'NO_INFORMADO',
      v.estado,
      v.estadoPedido,
      v.medioPago,
      centimos(v.total) / 100,
      monedaCsv(v),
    ]);
  } else if (tipo === 'resumen_ventas' || tipo === 'medios_pago' || tipo === 'canales') {
    const name =
      tipo === 'medios_pago' ? 'Medio de pago' : tipo === 'canales' ? 'Canal informado' : '';
    cabeceras = [
      ...(name ? [name] : []),
      'Moneda',
      'Ventas registradas',
      'Importe de pedidos registrados',
      'Observación monetaria',
    ];
    filas = agrupadas((v) =>
      tipo === 'medios_pago'
        ? [v.medioPago]
        : tipo === 'canales'
          ? [v.tipoVenta ?? 'NO_INFORMADO']
          : [],
    );
  } else if (tipo === 'detalles') {
    cabeceras = [
      'ID venta',
      'ID detalle',
      'Fecha venta Lima',
      'ID producto',
      'Producto',
      'Categoría',
      'Unidades',
      'Precio unitario histórico',
      'Subtotal línea sin envío',
      'Moneda',
    ];
    filas = detalles.map((r) => {
      const v = all.get(r.idVenta)!;
      return [
        id(r.idVenta),
        id(r.idDetalleVenta),
        fecha(v.fechaVenta),
        id(r.productoTalla.producto.idProducto),
        r.productoTalla.producto.nombre,
        r.productoTalla.producto.categoria?.nombreCategoria ?? '',
        entero(r.cantidad),
        centimos(r.precioUnitario) / 100,
        centimos(r.subtotal) / 100,
        monedaCsv(v),
      ];
    });
  } else if (tipo === 'productos_vendidos') {
    cabeceras = [
      'ID producto',
      'Producto',
      'Categoría',
      'Moneda',
      'Unidades vendidas',
      'Importe de líneas sin envío',
      'Observación monetaria',
    ];
    filas = agrupar(
      detalles.map((r) => ({
        dimension: [
          id(r.productoTalla.producto.idProducto),
          r.productoTalla.producto.nombre,
          r.productoTalla.producto.categoria?.nombreCategoria ?? '',
        ],
        moneda: monedaCsv(all.get(r.idVenta)!),
        cantidad: entero(r.cantidad),
        importe: centimos(r.subtotal),
      })),
    );
  } else if (tipo === 'catalogo') {
    criterio = 'CATALOGO_AL_MOMENTO_DE_CONSULTA_NO_HISTORICO';
    cabeceras = [
      'ID producto',
      'Producto',
      'Categoría',
      'Activo',
      'Precio catálogo actual',
      'Precio oferta actual',
      'Moneda',
    ];
    filas = d.productos.map((p) => [
      id(p.idProducto),
      p.nombre,
      p.categoria?.nombreCategoria ?? '',
      p.estado ? 'SI' : 'NO',
      centimos(p.precio) / 100,
      p.precioOferta == null ? null : centimos(p.precioOferta) / 100,
      monedaCsv(p),
    ]);
  } else if (tipo === 'inventario') {
    criterio = 'INVENTARIO_AL_MOMENTO_DE_CONSULTA_NO_HISTORICO';
    cabeceras = [
      'ID variante',
      'ID producto',
      'Producto',
      'ID color',
      'Talla',
      'Stock actual',
      'Producto activo',
    ];
    filas = d.inventario.map((r) => [
      id(r.idProductoTalla),
      id(r.producto.idProducto),
      r.producto.nombre,
      r.idColor ?? null,
      r.talla?.nombreTalla ?? 'SIN_TALLA',
      entero(r.stock),
      r.producto.estado ? 'SI' : 'NO',
    ]);
  } else if (tipo === 'clientes') {
    cabeceras = [
      'ID cliente',
      'Moneda',
      'Compras registradas',
      'Importe de pedidos registrados',
      'Observación monetaria',
    ];
    filas = agrupar(
      ventas
        .filter((v) => v.idUsuario != null)
        .map((v) => ({
          dimension: [id(v.idUsuario)],
          moneda: monedaCsv(v),
          cantidad: 1,
          importe: centimos(v.total),
        })),
    );
  } else if (tipo === 'clientes_cuentas') {
    criterio = 'CUENTAS_ACTUALES_SIN_FECHA_DE_ALTA_EN_DTO';
    cabeceras = ['ID cliente', 'Cuenta activa'];
    filas = d.usuarios
      .filter((u) => u.rol?.toUpperCase() === 'CLIENTE')
      .map((u) => [id(u.idUsuario), u.estado ? 'SI' : 'NO']);
  } else {
    if (
      !Array.isArray(d.yape) ||
      !Array.isArray(d.transferencias) ||
      !Array.isArray(d.contraentrega)
    )
      throw Error('No se han consultado todas las fuentes de pagos.');
    const pagos = [
      ...d.yape.map((p) => ({
        id: p.idVenta,
        medio: 'YAPE',
        estado: p.estado,
        importe: p.importe,
        moneda: monedaCsv(p),
        creado: p.creadoEn,
        verificado: p.verificadoEn,
        confirmado: p.estado === 'APROBADO',
      })),
      ...d.transferencias.map((p) => ({
        id: p.idVenta,
        medio: 'TRANSFERENCIA',
        estado: p.estado,
        importe: p.importe,
        moneda: monedaCsv(p),
        creado: p.creadoEn,
        verificado: p.verificadoEn,
        confirmado: p.estado === 'APROBADO',
      })),
      ...d.contraentrega.map((p) => ({
        id: p.idVenta,
        medio: 'CONTRA_ENTREGA',
        estado: p.estado,
        importe: p.monto,
        moneda: monedaCsv(p),
        creado: p.creadoEn,
        verificado: p.cobradoEn,
        confirmado: p.estado === 'COBRADO',
      })),
    ];
    const seen = new Set<string>();
    for (const p of pagos) {
      const key = p.medio + ':' + id(p.id),
        sale = all.get(p.id);
      if (seen.has(key) || !sale || sale.medioPago !== p.medio)
        throw Error('Relación de pago incompatible o duplicada; actualiza el reporte.');
      seen.add(key);
      centimos(p.importe);
      fecha(p.creado);
      if (p.verificado) fecha(p.verificado);
    }
    criterio =
      tipo === 'pagos'
        ? 'FECHA_CREACION_PAGO_LIMA'
        : 'FECHA_VERIFICACION_O_COBRO_LIMA_NO_NETO_DE_DEVOLUCIONES';
    const selected = pagos.filter((p) =>
      tipo === 'pagos'
        ? enPeriodo(p.creado, c.periodo, c.referencia)
        : p.confirmado && !!p.verificado && enPeriodo(p.verificado, c.periodo, c.referencia),
    );
    if (tipo === 'resumen_cobros') {
      cabeceras = [
        'Medio de pago',
        'Moneda',
        'Cobros verificados',
        'Importe bruto verificado',
        'Observación monetaria',
      ];
      filas = agrupar(
        selected.map((p) => ({
          dimension: [p.medio],
          moneda: p.moneda,
          cantidad: 1,
          importe: centimos(p.importe),
        })),
      );
    } else {
      cabeceras = [
        'ID venta',
        'Medio de pago',
        'Estado pago informado',
        'Fecha creación Lima',
        'Fecha verificación o cobro Lima',
        tipo === 'pagos' ? 'Importe pago registrado' : 'Importe bruto verificado',
        'Moneda',
        'Base de verificación',
      ];
      filas = selected.map((p) => [
        p.id,
        p.medio,
        p.estado,
        fecha(p.creado),
        p.verificado ? fecha(p.verificado) : '',
        centimos(p.importe) / 100,
        p.moneda,
        p.confirmado && p.verificado
          ? p.medio === 'CONTRA_ENTREGA'
            ? 'COBRO_REGISTRADO_POR_OPERADOR'
            : 'APROBACION_MANUAL_API_NO_CONCILIACION_AUTOMATICA'
          : 'SIN_VERIFICACION_CONFIRMADA',
      ]);
    }
  }
  const meta = [
    c.periodo,
    fechaLima(c.consultadoEn),
    fechaLima(c.generadoEn),
    ZONA_REPORTE,
    criterio,
  ];
  return {
    cabeceras: [
      ...cabeceras,
      'Período seleccionado',
      'Datos consultados Lima',
      'Generado Lima',
      'Zona horaria',
      'Criterio temporal',
    ],
    filas: filas.map((r) => [...r, ...meta]),
  };
}
