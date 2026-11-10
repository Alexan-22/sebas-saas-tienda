import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type BancoPeru = 'BCP' | 'BBVA' | 'INTERBANK' | 'SCOTIABANK';
export const BANCOS_PERU: {codigo: BancoPeru; nombre: string}[] = [
  { codigo: 'BCP', nombre: 'Banco de Crédito del Perú (BCP)' },
  { codigo: 'BBVA', nombre: 'BBVA Perú' },
  { codigo: 'INTERBANK', nombre: 'Interbank' },
  { codigo: 'SCOTIABANK', nombre: 'Scotiabank Perú' }
];
export interface CuentaBancaria {
  id?: number;
  moneda: 'PEN';
  banco: BancoPeru;
  titular: string;
  numeroCuenta: string;
  cci: string | null;
  habilitado: boolean;
}
export interface PagoTransferencia {
  idVenta: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  importe: number;
  moneda: 'PEN';
  banco: BancoPeru;
  titular: string;
  numeroCuenta: string;
  cci: string | null;
  correoCliente: string;
  creadoEn: string;
  verificadoPor: string | null;
  verificadoEn: string | null;
  motivoRechazo: string | null;
}
export interface InfoComprobante {
  idVenta: number;
  mimeTipo: string;
  tamanoBytes: number;
  sha256: string;
  enviadoEn: string;
}
export interface EventoTransferencia {
  ocurridoEn: string;
  evento: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  actorCorreo: string;
  observacion: string | null;
}
@Injectable({ providedIn:'root' })
export class TransferenciasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/transferencias`;
  cuentasPublicas(): Observable<CuentaBancaria[]> {
    return this.http.get<CuentaBancaria[]>(`${this.base}/publico`);
  }
  cuentasAdmin(): Observable<CuentaBancaria[]> {
    return this.http.get<CuentaBancaria[]>(`${this.base}/admin/cuentas`);
  }
  guardarCuenta(banco: BancoPeru, datos: CuentaBancaria): Observable<CuentaBancaria> {
    return this.http.put<CuentaBancaria>(`${this.base}/admin/cuentas/${banco}`, datos);
  }
  miPago(id: number): Observable<PagoTransferencia> {
    return this.http.get<PagoTransferencia>(`${this.base}/pagos/mios/${id}`);
  }
  misDatosComprobante(id: number): Observable<InfoComprobante> {
    return this.http.get<InfoComprobante>(`${this.base}/pagos/mios/${id}/comprobante`);
  }
  enviarComprobante(id: number, archivo: File): Observable<InfoComprobante> {
    const form = new FormData(); form.append('archivo', archivo, archivo.name);
    return this.http.post<InfoComprobante>(`${this.base}/pagos/mios/${id}/comprobante`, form);
  }
  imagenMia(id:number): Observable<Blob> { return this.http.get(`${this.base}/pagos/mios/${id}/comprobante/imagen`,{responseType:'blob'}); }
  reemplazarComprobante(id:number,archivo:File,motivo:string):Observable<InfoComprobante>{const f=new FormData();f.append('archivo',archivo,archivo.name);f.append('motivo',motivo);return this.http.post<InfoComprobante>(`${this.base}/pagos/mios/${id}/comprobante/reemplazo`,f);}
  contacto(id: number): Observable<{numeroWhatsapp:string|null;url:string|null}> {
    return this.http.get<{numeroWhatsapp:string|null;url:string|null}>(`${this.base}/pagos/mios/${id}/contacto`);
  }
  pagosAdmin(): Observable<PagoTransferencia[]> {
    return this.http.get<PagoTransferencia[]>(`${this.base}/pagos/admin`);
  }
  infoAdmin(id: number): Observable<InfoComprobante> {
    return this.http.get<InfoComprobante>(`${this.base}/pagos/admin/${id}/comprobante`);
  }
  imagenAdmin(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/pagos/admin/${id}/comprobante/imagen`, {responseType:'blob'});
  }
  auditoria(id: number): Observable<EventoTransferencia[]> {
    return this.http.get<EventoTransferencia[]>(`${this.base}/pagos/admin/${id}/auditoria`);
  }
  aprobar(id: number): Observable<PagoTransferencia> {
    return this.http.post<PagoTransferencia>(`${this.base}/pagos/admin/${id}/aprobar`, {});
  }
  rechazar(id: number,motivo:string): Observable<PagoTransferencia> {
    return this.http.post<PagoTransferencia>(`${this.base}/pagos/admin/${id}/rechazar`, {motivo});
  }
}
