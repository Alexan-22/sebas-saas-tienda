import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ContraEntregaConfig { habilitado: boolean; cobertura: string; }
export interface CobroContraEntrega {
  idVenta: number;
  monto: number;
  estado: 'PENDIENTE' | 'COBRADO' | 'INCIDENCIA' | 'CANCELADO';
  metodoCobro: 'EFECTIVO' | 'YAPE' | null;
  referenciaCobro: string | null;
  cobradoEn: string | null;
  creadoEn: string;
  estadoEnvio: string;
}

@Injectable({ providedIn: 'root' })
export class ContraEntregaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/ventas`;

  config(): Observable<ContraEntregaConfig> {
    return this.http.get<ContraEntregaConfig>(`${this.base}/contraentrega/config`);
  }
  listar(): Observable<CobroContraEntrega[]> {
    return this.http.get<CobroContraEntrega[]>(`${this.base}/admin/contraentrega`);
  }
  cancelar(idVenta: number, motivo: string): Observable<{idVenta:number;estadoPedido:string;estadoCobro:string;estadoEnvio:string;unidadesRepuestas:number}> {
    return this.http.patch<{idVenta:number;estadoPedido:string;estadoCobro:string;estadoEnvio:string;unidadesRepuestas:number}>(
      `${this.base}/admin/contraentrega/${idVenta}/cancelar`, { motivo }
    );
  }

  confirmar(idVenta: number, metodo: 'EFECTIVO' | 'YAPE', referencia: string): Observable<CobroContraEntrega> {
    return this.http.patch<CobroContraEntrega>(
      `${this.base}/admin/contraentrega/${idVenta}/cobrar`,
      { metodo, referencia, dineroRecibido: true }
    );
  }
}
