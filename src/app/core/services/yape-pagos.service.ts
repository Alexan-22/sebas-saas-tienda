import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoPagoYape = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface PagoYapeManual {
  idVenta: number;
  estado: EstadoPagoYape;
  importe: number;
  moneda: string;
  numeroYape: string;
  titularYape: string;
  correoCliente: string;
  qrUrl: string;
  creadoEn: string;
  verificadoPor: string | null;
  verificadoEn: string | null;
  motivoRechazo: string | null;
}

export interface EventoYape {
  ocurridoEn: string;
  evento: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  actorCorreo: string;
  observacion: string | null;
}

@Injectable({ providedIn: 'root' })
export class YapePagosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/yape/pagos`;

  mio(idVenta: number): Observable<PagoYapeManual> {
    return this.http.get<PagoYapeManual>(`${this.base}/mios/${idVenta}`);
  }

  qrMio(idVenta: number): Observable<Blob> {
    return this.http.get(`${this.base}/mios/${idVenta}/qr`, { responseType: 'blob' });
  }

  listarAdmin(): Observable<PagoYapeManual[]> {
    return this.http.get<PagoYapeManual[]>(`${this.base}/admin`);
  }

  auditoria(idVenta: number): Observable<EventoYape[]> {
    return this.http.get<EventoYape[]>(`${this.base}/admin/${idVenta}/auditoria`);
  }

  aprobar(idVenta: number): Observable<PagoYapeManual> {
    return this.http.post<PagoYapeManual>(`${this.base}/admin/${idVenta}/aprobar`, {});
  }

  rechazar(idVenta: number, motivo: string): Observable<PagoYapeManual> {
    return this.http.post<PagoYapeManual>(`${this.base}/admin/${idVenta}/rechazar`, { motivo });
  }
}
