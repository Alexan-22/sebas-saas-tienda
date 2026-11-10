import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../models/producto';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private readonly apiUrl = `${environment.apiUrl}/api/productos`;

  constructor(
    private http: HttpClient
  ) {}

  // =====================================================
  // PÚBLICO
  // =====================================================
  listarAdmin(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/admin`);
  }

  buscarAdmin(idProducto: number): Observable<Producto> {
    return this.http.get<Producto>(
      `${this.apiUrl}/admin/${idProducto}`
    );
  }

  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/public`);
  }

  buscarPorId(idProducto: number): Observable<Producto> {
    return this.http.get<Producto>(
      `${this.apiUrl}/public/${idProducto}`
    );
  }

  porGenero(idGenero: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(
      `${this.apiUrl}/public/genero/${idGenero}`
    );
  }

  porCategoria(idCategoria: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(
      `${this.apiUrl}/public/categoria/${idCategoria}`
    );
  }

  // =====================================================
  // ADMIN - CREAR
  // =====================================================
  crear(
    producto: Partial<Producto>,
    idGenero: number,
    idCategoria: number
  ): Observable<Producto> {
    const params = new HttpParams()
      .set('idGenero', idGenero.toString())
      .set('idCategoria', idCategoria.toString());

    return this.http.post<Producto>(
      `${this.apiUrl}/admin`,
      producto,
      { params }
    );
  }

  // =====================================================
  // ADMIN - ACTUALIZAR
  // =====================================================
  actualizar(
    idProducto: number,
    producto: Partial<Producto>,
    idGenero: number,
    idCategoria: number
  ): Observable<Producto> {
    const params = new HttpParams()
      .set('idGenero', idGenero.toString())
      .set('idCategoria', idCategoria.toString());

    return this.http.put<Producto>(
      `${this.apiUrl}/admin/${idProducto}`,
      producto,
      { params }
    );
  }

  // =====================================================
  // ADMIN - ELIMINAR
  // =====================================================
  eliminar(idProducto: number): Observable<string> {
    return this.http.delete(
      `${this.apiUrl}/admin/${idProducto}`,
      {
        responseType: 'text'
      }
    );
  }
}