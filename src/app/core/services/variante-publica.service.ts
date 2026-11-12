import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TallaVariantePublica {
  idTalla: number;
  nombreTalla: string;
  estado: boolean;
}

export interface VariantePublica {
  idProductoTalla: number;
  idProducto: number;
  talla: TallaVariantePublica | null;
  idColor: number | null;
  colorNombre: string | null;
  colorHex: string | null;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class VariantePublicaService {
  private readonly http = inject(HttpClient);

  listarPorProducto(idProducto: number): Observable<VariantePublica[]> {
    return this.http.get<VariantePublica[]>(
      `${environment.apiUrl}/api/v1/tiendas/variantes/producto/${idProducto}`
    );
  }
}
