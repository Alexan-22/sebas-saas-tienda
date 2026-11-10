import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface YapeComprobanteInfo {
  idVenta: number;
  mimeTipo: 'image/png' | 'image/jpeg';
  tamanoBytes: number;
  sha256: string;
  enviadoEn: string;
}

export interface ContactoWhatsapp {
  numeroWhatsapp: string | null;
  url: string | null;
}

@Injectable({ providedIn: 'root' })
export class YapeComprobantesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/yape/pagos`;

  subir(idVenta: number, archivo: File): Observable<YapeComprobanteInfo> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    return this.http.post<YapeComprobanteInfo>(
      `${this.base}/mios/${idVenta}/comprobante`, datos
    ); // Angular/Browser añade el multipart boundary automáticamente.
  }

  infoCliente(idVenta: number): Observable<YapeComprobanteInfo> {
    return this.http.get<YapeComprobanteInfo>(`${this.base}/mios/${idVenta}/comprobante`);
  }

  imagenCliente(idVenta: number): Observable<Blob> {
    return this.http.get(`${this.base}/mios/${idVenta}/comprobante/imagen`, {
      responseType: 'blob'
    });
  }

  contacto(idVenta: number): Observable<ContactoWhatsapp> {
    return this.http.get<ContactoWhatsapp>(`${this.base}/mios/${idVenta}/contacto`);
  }

  infoAdmin(idVenta: number): Observable<YapeComprobanteInfo> {
    return this.http.get<YapeComprobanteInfo>(`${this.base}/admin/${idVenta}/comprobante`);
  }

  imagenAdmin(idVenta: number): Observable<Blob> {
    return this.http.get(`${this.base}/admin/${idVenta}/comprobante/imagen`, {
      responseType: 'blob'
    });
  }
}
