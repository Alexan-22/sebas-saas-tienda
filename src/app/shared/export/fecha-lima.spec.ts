import { enPeriodo, fechaHoraLima, fechaLima } from './fecha-lima';
describe('Fechas comerciales Lima', () => {
  const corte = new Date('2026-11-14T04:30:00Z');
  it('usa Lima aunque UTC ya cambió de día', () => {
    expect(fechaLima(corte)).toBe('2026-11-13 23:30:00');
    expect(enPeriodo('2026-11-14T04:59:59Z', 'HOY', corte)).toBe(true);
    expect(enPeriodo('2026-11-14T05:00:00Z', 'HOY', corte)).toBe(false);
  });
  it('no desplaza dos veces un LocalDateTime legacy', () => {
    expect(fechaHoraLima('2026-11-13T23:30:00')).toBe('2026-11-13 23:30:00');
    expect(fechaHoraLima('2026-11-14T06:30:00+01:00')).toBe('2026-11-14 00:30:00');
  });
  for (const raw of ['2026-02-30T12:00:00', '2026-13-01T12:00:00', '2026-11-13T24:00:00', 'bad'])
    it('rechaza fecha ' + raw, () => expect(fechaHoraLima(raw)).toBe(''));
  for (const [periodo, inside, outside] of [
    ['AYER', '2026-11-12', '2026-11-13'],
    ['7', '2026-11-07', '2026-11-06'],
    ['15', '2026-10-30', '2026-10-29'],
    ['30', '2026-10-15', '2026-10-14'],
    ['MES', '2026-11-01', '2026-10-31'],
    ['ANIO', '2026-01-01', '2025-12-31'],
    ['ULTIMO_ANIO', '2025-11-13', '2025-11-12'],
  ])
    it('respeta límites ' + periodo, () => {
      expect(enPeriodo(inside + 'T12:00:00', periodo, corte)).toBe(true);
      expect(enPeriodo(outside + 'T12:00:00', periodo, corte)).toBe(false);
    });
  it('último año conserva límite calendario de año bisiesto', () => {
    expect(enPeriodo('2023-02-28T12:00:00', 'ULTIMO_ANIO', new Date('2024-02-29T17:00:00Z'))).toBe(
      true,
    );
  });
  it('período inválido no equivale a todos', () =>
    expect(() => enPeriodo('2026-01-01T00:00:00', 'DESCONOCIDO', corte)).toThrow());
});
