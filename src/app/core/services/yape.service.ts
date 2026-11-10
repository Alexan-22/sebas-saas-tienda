import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface YapeConfiguracion {
  habilitado: boolean;
  numeroYape: string | null;
  titularYape: string | null;
  qrUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class YapeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/yape`;

  publico(): Observable<YapeConfiguracion> {
    return this.http.get<YapeConfiguracion>(`${this.base}/publico`);
  }

  configuracionAdmin(): Observable<YapeConfiguracion> {
    return this.http.get<YapeConfiguracion>(`${this.base}/admin/configuracion`);
  }

  guardarConfiguracion(datos: YapeConfiguracion): Observable<YapeConfiguracion> {
    return this.http.put<YapeConfiguracion>(`${this.base}/admin/configuracion`, datos);
  }

  subirQr(archivo: File): Observable<YapeConfiguracion> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    // No establecer Content-Type: el navegador debe agregar boundary multipart.
    return this.http.post<YapeConfiguracion>(`${this.base}/admin/qr`, datos);
  }

  obtenerQrAdmin(): Observable<Blob> {
    return this.http.get(`${this.base}/admin/qr`, { responseType: 'blob' });
  }
}
