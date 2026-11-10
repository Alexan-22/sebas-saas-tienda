import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoPago =
  | 'PENDIENTE'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'EXPIRADO'
  | 'REEMBOLSADO';

export interface PagoPersistente {
  id: string;
  tiendaId: number;
  pedidoId: number;
  monto: number;
  moneda: string;
  estado: EstadoPago;
}

export interface ConfiguracionSandbox {
  proveedor: string;
  habilitado: boolean;
  modo: string;
}

@Injectable({
  providedIn: 'root'
})
export class PagosService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/api/pagos/admin`;

  configuracion(): Observable<ConfiguracionSandbox> {
    return this.http.get<ConfiguracionSandbox>(
      `${this.apiUrl}/configuracion`
    );
  }

  actualizarConfiguracion(
    habilitado: boolean
  ): Observable<ConfiguracionSandbox> {
    return this.http.put<ConfiguracionSandbox>(
      `${this.apiUrl}/configuracion`,
      { habilitado }
    );
  }

  listar(pagina: number = 0): Observable<PagoPersistente[]> {
    const params = new HttpParams().set(
      'pagina',
      String(pagina)
    );

    return this.http.get<PagoPersistente[]>(
      this.apiUrl,
      { params }
    );
  }

  consultar(id: string): Observable<PagoPersistente> {
    return this.http.get<PagoPersistente>(
      `${this.apiUrl}/${encodeURIComponent(id)}`
    );
  }
}
