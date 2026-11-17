import { crearReporteCsv, REPORTES_CSV } from './reportes-csv';
import { construirCsv } from '../../../../shared/export/csv-export';
import { contextoFicticio, datosFicticios } from '../testing/reportes.fixture';
describe('Proyecciones CSV administrativas por tienda', () => {
  it('ventas respeta período Lima, excluye canceladas y conserva importes individuales', () => {
    const t = crearReporteCsv('ventas', datosFicticios(), contextoFicticio());
    expect(t.filas.map((r) => r[0])).toEqual([1, 2, 6]);
    expect(t.filas[0][1]).toBe('2026-11-13 23:59:59');
    expect(t.filas[0][6]).toBe(0.1);
    expect(t.filas[2][7]).toBe('NO_INFORMADA');
  });
  it('suma en céntimos y no agrega importes sin moneda', () => {
    const t = crearReporteCsv('resumen_ventas', datosFicticios(), contextoFicticio());
    expect(t.filas[0].slice(0, 4)).toEqual(['PEN', 2, 0.3, 'SUMA_DE_IMPORTES_REGISTRADOS']);
    expect(t.filas[1].slice(0, 4)).toEqual([
      'NO_INFORMADA',
      1,
      null,
      'TOTAL_NO_CALCULADO_SIN_MONEDA',
    ]);
  });
  it('no mezcla monedas en totales, canales ni clientes', () => {
    for (const tipo of ['resumen_ventas', 'canales', 'clientes'] as const) {
      const t = crearReporteCsv(tipo, datosFicticios(), contextoFicticio('TODO'));
      expect(t.filas.some((r) => r.includes('USD'))).toBe(true);
      expect(t.filas.some((r) => r.includes('PEN'))).toBe(true);
    }
  });
  it('detalles usan precios históricos y no arrastran IDs ajenos al conjunto de ventas', () => {
    const t = crearReporteCsv('detalles', datosFicticios(), contextoFicticio());
    expect(t.filas.map((r) => r[0])).toEqual([1, 2]);
    expect(t.filas[0][7]).toBe(0.1);
    expect(JSON.stringify(t)).not.toContain('TENANT_B_NO_EXPORTAR');
  });
  it('productos vendidos por período no se confunden con inventario actual', () => {
    const d = datosFicticios(),
      c = contextoFicticio('AYER'),
      vendidos = crearReporteCsv('productos_vendidos', d, c),
      stock = crearReporteCsv('inventario', d, c);
    expect(vendidos.filas[0][4]).toBe(1);
    expect(stock.filas[0][5]).toBe(3);
    expect(stock.filas[0].at(-1)).toContain('NO_HISTORICO');
  });
  it('clientes minimiza PII y cuentas excluye administradores', () => {
    const t = crearReporteCsv('clientes_cuentas', datosFicticios(), contextoFicticio());
    expect(t.filas.map((r) => r[0])).toEqual([7, 8]);
    expect(t.filas[0].at(-1)).toContain('SIN_FECHA_DE_ALTA');
  });
  it('cobros usa fecha de verificación, no fecha de venta ni estado del pedido', () => {
    const t = crearReporteCsv('cobros', datosFicticios(), contextoFicticio());
    expect(t.filas.map((r) => r[0])).toEqual([3, 6]);
    expect(t.filas[0][4]).toBe('2026-11-13 12:00:00');
    expect(t.filas[0][7]).toContain('MANUAL');
  });
  it('pago pendiente y aprobación sin fecha no se convierten en cobros', () => {
    const d = datosFicticios();
    d.yape![0].verificadoEn = null;
    const t = crearReporteCsv('cobros', d, contextoFicticio('TODO'));
    expect(t.filas.some((r) => r[0] === 1 || r[0] === 2)).toBe(false);
    expect(
      crearReporteCsv('pagos', d, contextoFicticio('TODO')).filas.some((r) => r[0] === 2),
    ).toBe(true);
  });
  it('rechaza pagos huérfanos, duplicados o asociados a otro medio', () => {
    const d = datosFicticios();
    d.yape!.push({ ...d.yape![0] });
    expect(() => crearReporteCsv('pagos', d, contextoFicticio())).toThrow();
    const other = datosFicticios();
    other.yape![0].idVenta = 999;
    expect(() => crearReporteCsv('pagos', other, contextoFicticio())).toThrow();
  });
  it('datos no válidos no se convierten en cero', () => {
    const d = datosFicticios();
    d.ventas[0].total = NaN;
    expect(() => crearReporteCsv('ventas', d, contextoFicticio())).toThrow();
  });
  for (const [tipo] of REPORTES_CSV)
    it('tabla normalizada sin PII ni secretos: ' + tipo, () => {
      const t = crearReporteCsv(tipo, datosFicticios(), contextoFicticio('TODO'));
      expect(t.filas.every((r) => r.length === t.cabeceras.length)).toBe(true);
      const csv = construirCsv(t.cabeceras, t.filas);
      for (const forbidden of [
        'privado@example',
        'NO_EXPORTAR',
        'TENANT_B',
        'passwordHash',
        'qrUrl',
      ])
        expect(csv).not.toContain(forbidden);
      expect(t.cabeceras).not.toContain('Correo');
    });
  it('dataset vacío no fabrica cobros ni totales', () => {
    const d = datosFicticios();
    for (const key of [
      'ventas',
      'detalles',
      'productos',
      'inventario',
      'usuarios',
      'yape',
      'transferencias',
      'contraentrega',
    ] as const)
      d[key] = [];
    expect(crearReporteCsv('resumen_cobros', d, contextoFicticio()).filas).toEqual([]);
  });
});
