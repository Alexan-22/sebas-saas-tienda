import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConfigB2b {
  habilitado: boolean;
  minimoPrendas: number;
  minimoMonto: number;
}
export interface EscalaB2b {
  cantidadMinima: number;
  precioUnitario: number;
}
export interface ProductoB2b {
  idProducto: number;
  nombre: string;
  precio: number;
  precioOferta: number | null;
  estado: boolean;
}
@Injectable({ providedIn: 'root' })
export class B2bService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/b2b`;

  obtenerConfig(): Observable<ConfigB2b> {
    return this.http.get<ConfigB2b>(`${this.url}/admin/config`);
  }
  guardarConfig(config: ConfigB2b): Observable<ConfigB2b> {
    return this.http.put<ConfigB2b>(`${this.url}/admin/config`, config);
  }
  listarProductos(): Observable<ProductoB2b[]> {
    return this.http.get<ProductoB2b[]>(`${environment.apiUrl}/api/productos/admin`);
  }
  listarEscalas(productoId: number): Observable<EscalaB2b[]> {
    return this.http.get<EscalaB2b[]>(`${this.url}/admin/productos/${productoId}/escalas`);
  }
  guardarEscalas(productoId: number, escalas: EscalaB2b[]): Observable<EscalaB2b[]> {
    return this.http.put<EscalaB2b[]>(`${this.url}/admin/productos/${productoId}/escalas`, { escalas });
  }
}
