import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TipoVariantes =
  | 'SIN_VARIANTES'
  | 'SOLO_COLOR'
  | 'SOLO_TALLA'
  | 'COLOR_Y_TALLA';

export interface ConfiguracionVariantes {
  tipo: TipoVariantes;
  sistemaTallas: string;
}

export interface VarianteAdmin {
  idProductoTalla: number;
  idProducto: number;
  idTalla: number | null;
  idColor: number | null;
  talla: string | null;
  color: string | null;
  stock: number;
}

export interface NuevaVariante {
  idProducto: number;
  idTalla: number | null;
  idColor: number | null;
  stock: number;
}

export interface ColorTienda {
  idColor: number;
  nombre: string;
  codigoHex: string | null;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VariantesAdminService {

  private readonly http = inject(HttpClient);

  private readonly base =
    `${environment.apiUrl}/api/v1/tiendas/admin`;

  listarColores(): Observable<ColorTienda[]> {
    return this.http.get<ColorTienda[]>(
      `${this.base}/colores`
    );
  }

  listarVariantes(
    idProducto: number
  ): Observable<VarianteAdmin[]> {
    return this.http.get<VarianteAdmin[]>(
      `${this.base}/variantes/producto/${idProducto}`
    );
  }

  configurar(
    idProducto: number,
    configuracion: ConfiguracionVariantes
  ): Observable<{
    idProducto: number;
    tipo: TipoVariantes;
    sistemaTallas: string;
  }> {
    return this.http.put<{
      idProducto: number;
      tipo: TipoVariantes;
      sistemaTallas: string;
    }>(
      `${this.base}/variantes/producto/${idProducto}/configuracion`,
      configuracion
    );
  }

  crearVariante(
    datos: NuevaVariante
  ): Observable<{ idProductoTalla: number }> {
    return this.http.post<{ idProductoTalla: number }>(
      `${this.base}/variantes`,
      datos
    );
  }
}