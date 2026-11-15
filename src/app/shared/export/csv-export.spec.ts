import { construirCsv, celdaCsv } from './csv-export';
import * as XLSX from 'xlsx';
describe('CSV interoperable y seguro', () => {
  it('BOM UTF-8, CRLF, comillas y saltos de línea sin romper columnas', () => {
    const text = construirCsv(['Nombre', 'Importe'], [['Niña; \"A\"\nLima', 12.5]]);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('12.5');
    expect(text.endsWith('\r\n')).toBe(true);
    const w = XLSX.read(new TextEncoder().encode(text), { type: 'array', FS: ';', raw: false });
    const rows = XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], { header: 1 });
    expect(rows).toEqual([
      ['Nombre', 'Importe'],
      ['Niña; \"A\"\nLima', 12.5],
    ]);
  });
  for (const value of [
    '=SUM(A1)',
    '+cmd',
    '-1+1',
    '@SUM(A1)',
    '  =1',
    '\t=1',
    '\r\n+1',
    '\u200B=1',
    '＝1',
    '＋1',
    '－1',
    '＠A1',
  ])
    it('mitiga texto fórmula ' + JSON.stringify(value), () => {
      expect(celdaCsv(value).startsWith('\"\'')).toBe(true);
      const w = XLSX.read(construirCsv(['Texto'], [[value]], ','), {
        type: 'string',
        FS: ',',
        raw: false,
      });
      expect(w.Sheets[w.SheetNames[0]]['A2'].f).toBeUndefined();
    });
  it('conserva números, cero y negativos como números, no fórmulas de texto', () => {
    expect(celdaCsv(-12.5)).toBe('-12.5');
    expect(celdaCsv(0)).toBe('0');
  });
  for (const fs of [',', ';'] as const)
    it('importa números y Unicode con separador ' + fs, () => {
      const text = construirCsv(
        ['Producto', 'Moneda', 'Importe'],
        [['Muñeca, talla; niña', 'PEN', 1234.5]],
        fs,
      );
      const w = XLSX.read(text, { type: 'string', FS: fs, raw: false }),
        sheet = w.Sheets[w.SheetNames[0]];
      expect(sheet['A2'].v).toBe('Muñeca, talla; niña');
      expect(sheet['C2'].t).toBe('n');
      expect(sheet['C2'].v).toBe(1234.5);
    });
  it('rechaza filas no rectangulares y números no finitos', () => {
    expect(() => construirCsv(['A'], [[1, 2]])).toThrow();
    expect(() => celdaCsv(NaN)).toThrow();
    expect(() => celdaCsv(Infinity)).toThrow();
  });
  it('vacío tiene cabecera sin filas falsas de totales', () => {
    expect(construirCsv(['ID', 'Importe'], [])).toBe('\uFEFF\"ID\";\"Importe\"\r\n');
  });
});
