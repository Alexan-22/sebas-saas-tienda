export const ZONA_REPORTE = 'America/Lima';
export const PERIODOS_REPORTE = [
  'TODO',
  'HOY',
  'AYER',
  '7',
  '15',
  '30',
  'MES',
  'ANIO',
  'ULTIMO_ANIO',
] as const;
const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_REPORTE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
export function fechaLima(fecha: Date): string {
  if (!Number.isFinite(fecha.getTime())) throw new Error('Fecha de corte inválida.');
  const partes = formato.formatToParts(fecha),
    p = (tipo: string) => partes.find((x) => x.type === tipo)!.value;
  return (
    p('year') +
    '-' +
    p('month') +
    '-' +
    p('day') +
    ' ' +
    p('hour') +
    ':' +
    p('minute') +
    ':' +
    p('second')
  );
}
export function fechaHoraLima(raw: string): string {
  if (typeof raw !== 'string') return '';
  const m = raw.match(
    /^(\d{4}-\d{2}-\d{2})(?:T| )(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?$/,
  );
  if (!m) return '';
  const calendario = new Date(m[1] + 'T00:00:00Z');
  if (
    !Number.isFinite(calendario.getTime()) ||
    m[1] < '0001-01-01' ||
    m[1] > '9998-12-31' ||
    calendario.toISOString().slice(0, 10) !== m[1] ||
    +m[2] > 23 ||
    +m[3] > 59 ||
    +m[4] > 59
  )
    return '';
  if (!m[5]) return m[1] + ' ' + m[2] + ':' + m[3] + ':' + m[4]; // DTO LocalDateTime legacy: interpretar en Lima, sin doble desplazamiento.
  const d = new Date(raw.replace(' ', 'T'));
  return Number.isFinite(d.getTime()) ? fechaLima(d) : '';
}
const desplazar = (dia: string, n: number) =>
  new Date(Date.parse(dia + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export function enPeriodo(raw: string, periodo: string, corte: Date): boolean {
  if (!PERIODOS_REPORTE.includes(periodo as never)) throw new Error('Período no reconocido.');
  let fecha: string;
  try {
    fecha = fechaHoraLima(raw).slice(0, 10);
  } catch {
    return false;
  }
  if (!fecha) return false;
  if (periodo === 'TODO') return true;
  const hoy = fechaLima(corte).slice(0, 10);
  if (periodo === 'AYER') return fecha === desplazar(hoy, -1);
  let inicio = hoy;
  if (['7', '15', '30'].includes(periodo)) inicio = desplazar(hoy, 1 - Number(periodo));
  if (periodo === 'MES') inicio = hoy.slice(0, 7) + '-01';
  if (periodo === 'ANIO') inicio = hoy.slice(0, 4) + '-01-01';
  if (periodo === 'ULTIMO_ANIO') {
    inicio = String(Number(hoy.slice(0, 4)) - 1).padStart(4, '0') + hoy.slice(4);
    if (new Date(inicio + 'T00:00:00Z').toISOString().slice(0, 10) !== inicio)
      inicio = inicio.slice(0, 8) + '28';
  }
  return fecha >= inicio && fecha <= hoy;
}
