export type CeldaCsv = string | number | boolean | null | undefined;
export type SeparadorCsv = ',' | ';';
// Adaptación del csvSeguro de Superadmin: no depende de sus modelos ni API globales.
export function celdaCsv(valor: CeldaCsv): string {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) throw new Error('Número CSV inválido.');
    return String(valor); // Número real, sin moneda ni agrupación de miles.
  }
  let texto = String(valor ?? '');
  if (/^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}
export function construirCsv(
  cabeceras: readonly string[],
  filas: readonly (readonly CeldaCsv[])[],
  separador: SeparadorCsv = ';',
): string {
  if (![',', ';'].includes(separador) || !cabeceras.length)
    throw new Error('Formato CSV inválido.');
  if (filas.some((f) => f.length !== cabeceras.length))
    throw new Error('La tabla CSV no es rectangular.');
  return (
    '\uFEFF' +
    [cabeceras, ...filas].map((f) => f.map(celdaCsv).join(separador)).join('\r\n') +
    '\r\n'
  );
}
