import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ItemCotizacionB2b { idProducto: number; cantidad: number; }
export interface LineaCotizadaB2b {
  idProducto: number;
  nombre: string;
  cantidad: number;
  precioBase: number;
  precioAplicado: number;
  subtotalBase: number;
  subtotalCotizado: number;
  ahorro: number;
  escalaAplicada: boolean;
}
export interface ResultadoCotizacionB2b {
  b2bHabilitado: boolean;
  cumpleMinimos: boolean;
  unidades: number;
  minimoPrendas: number;
  minimoMonto: number;
  faltanPrendas: number;
  faltanMonto: number;
  subtotalBase: number;
  totalCotizado: number;
  ahorroEstimado: number;
  lineas: LineaCotizadaB2b[];
  aviso: string;
}

@Injectable({ providedIn: 'root' })
export class B2bCotizadorService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/b2b/admin/cotizar`;

  cotizar(items: ItemCotizacionB2b[]): Observable<ResultadoCotizacionB2b> {
    return this.http.post<ResultadoCotizacionB2b>(this.url, { items });
  }
}
