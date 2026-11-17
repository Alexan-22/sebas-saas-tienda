import { Injectable } from '@angular/core';
import { crearReportePdf } from './reportes-pdf';
import { ContextoCsv, DatosCsvTienda } from './reportes-csv';
@Injectable({ providedIn: 'root' })
export class ReportesPdfService {
  crear(datos: DatosCsvTienda, contexto: ContextoCsv, tienda: string) {
    return crearReportePdf(datos, contexto, tienda);
  }
}
