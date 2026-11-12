import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductoImagen } from '../models/producto-imagen';

@Injectable({
  providedIn: 'root'
})
export class ProductoImagenService {
  private readonly apiUrl = `${environment.apiUrl}/api/producto-imagenes`;

  constructor(
    private http: HttpClient
  ) {}

  // ==========================================
  // LISTAR IMÁGENES DE UN PRODUCTO
  // ==========================================
  listarPorProducto(idProducto: number): Observable<ProductoImagen[]> {
    return this.http.get<ProductoImagen[]>(
      `${this.apiUrl}/producto/${idProducto}`
    );
  }

  listarAdmin(idProducto: number): Observable<ProductoImagen[]> {
    return this.http.get<ProductoImagen[]>(`${this.apiUrl}/admin/producto/${idProducto}`);
  }

  // ==========================================
  // SUBIR IMAGEN
  // ==========================================
  subir(idProducto: number, archivo: File, orden: number = 0): Observable<ProductoImagen> {
    const formData = new FormData();

    formData.append('imagen', archivo);

    const params = new HttpParams()
      .set('orden', orden.toString());

    return this.http.post<ProductoImagen>(
      `${this.apiUrl}/admin/producto/${idProducto}`,
      formData,
      { params }
    );
  }

  // ==========================================
  // ELIMINAR IMAGEN
  // ==========================================
  listarColores(): Observable<{
    idColor: number;
    nombre: string;
    codigoHex: string;
    activo: boolean;
  }[]> {
    return this.http.get<{
      idColor: number;
      nombre: string;
      codigoHex: string;
      activo: boolean;
    }[]>(
      `${environment.apiUrl}/api/v1/tiendas/admin/colores`
    );
  }

  asignarColor(
    idImagen: number,
    idColor: number | null
  ): Observable<{
    idProductoImagen: number;
    idColor: number | null;
    mensaje: string;
  }> {
    return this.http.put<{
      idProductoImagen: number;
      idColor: number | null;
      mensaje: string;
    }>(
      `${environment.apiUrl}/api/v1/tiendas/admin/imagenes-color/${idImagen}`,
      { idColor }
    );
  }
  eliminar(idProductoImagen: number): Observable<string> {
    return this.http.delete(
      `${this.apiUrl}/admin/${idProductoImagen}`,
      {
        responseType: 'text'
      }
    );
  }
}
