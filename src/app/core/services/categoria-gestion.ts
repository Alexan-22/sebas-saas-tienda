
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Categoria } from '../models/producto';

export interface CategoriaDatos {
  nombreCategoria: string;
  estado: boolean;
}

@Injectable({ providedIn: 'root' })
export class CategoriaGestionService {

  private readonly http = inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/api/categorias/admin`;

  listar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.url);
  }

  crear(datos: CategoriaDatos): Observable<Categoria> {
    return this.http.post<Categoria>(this.url, datos);
  }

  actualizar(
    id: number,
    datos: CategoriaDatos
  ): Observable<Categoria> {
    return this.http.put<Categoria>(
      `${this.url}/${id}`,
      datos
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.url}/${id}`
    );
  }
}
