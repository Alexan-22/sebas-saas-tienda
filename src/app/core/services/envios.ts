import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export type OperadorEnvio = 'SHALOM' | 'OLVA' | 'PROPIO';
export type ModalidadEnvio = 'AGENCIA' | 'DOMICILIO';
export type EstadoEnvio = 'PENDIENTE' | 'PREPARANDO' | 'DESPACHADO' | 'EN_TRANSITO'
  | 'DISPONIBLE_RETIRO' | 'ENTREGADO' | 'INCIDENCIA' | 'CANCELADO';

export interface Envio {
  id: number;
  idVenta: number;
  operador: OperadorEnvio;
  modalidad: ModalidadEnvio;
  estado: EstadoEnvio;
  numeroGuia: string | null;
  codigoRastreo: string | null;
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface GuardarEnvio {
  operador: OperadorEnvio;
  modalidad: ModalidadEnvio;
  numeroGuia: string;
  codigoRastreo: string;
  observaciones: string;
}

export interface VentaLogistica {
  idVenta: number;
  tipoVenta: string;
  nombreCliente?: string;
  apellidoCliente?: string;
  fechaVenta?: string;
}

@Injectable({ providedIn: 'root' })
export class EnviosService {
  private readonly http = inject(HttpClient);
  private readonly ruta = `${environment.apiUrl}/api/ventas`;

  ventas(): Observable<VentaLogistica[]> {
    return forkJoin({
      ventas: this.http.get<VentaLogistica[]>(`${this.ruta}/admin`),
      elegibles: this.http.get<number[]>(`${this.ruta}/admin/envios/ventas-elegibles`)
    }).pipe(
      map(({ ventas, elegibles }) => {
        const idsConfirmados = new Set(elegibles ?? []);
        return (ventas ?? []).filter(v => idsConfirmados.has(v.idVenta));
      })
    );
  }
  listar(): Observable<Envio[]> {
    return this.http.get<Envio[]>(`${this.ruta}/admin/envios`);
  }
  obtener(idVenta: number): Observable<Envio> {
    return this.http.get<Envio>(`${this.ruta}/admin/${idVenta}/envio`);
  }
  guardar(idVenta: number, datos: GuardarEnvio): Observable<Envio> {
    return this.http.put<Envio>(`${this.ruta}/admin/${idVenta}/envio`, datos);
  }
  estado(idVenta: number, estado: EstadoEnvio): Observable<Envio> {
    return this.http.patch<Envio>(`${this.ruta}/admin/${idVenta}/envio/estado`, { estado });
  }
}
