import { Injectable } from '@angular/core';
import { CeldaCsv, construirCsv, SeparadorCsv } from './csv-export';
@Injectable({ providedIn: 'root' })
export class CsvExportService {
  descargar(
    nombre: string,
    cabeceras: readonly string[],
    filas: readonly (readonly CeldaCsv[])[],
    separador: SeparadorCsv = ';',
  ): void {
    const contenido = construirCsv(cabeceras, filas, separador);
    const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.hidden = true;
    document.body.appendChild(enlace);
    try {
      enlace.click();
    } finally {
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}
