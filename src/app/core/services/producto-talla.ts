import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductoTalla } from '../models/producto-talla';

@Injectable({
  providedIn: 'root'
})
export class ProductoTallaService {
  private readonly apiUrl = `${environment.apiUrl}/api/producto-tallas`;

  constructor(
    private http: HttpClient
  ) {}

  // =========================================================
  // PÚBLICO - TALLAS Y STOCK DE UN PRODUCTO
  // =========================================================
  listarPorProducto(idProducto: number): Observable<ProductoTalla[]> {
    return this.http.get<ProductoTalla[]>(
      `${this.apiUrl}/producto/${idProducto}`
    );
  }

  // =========================================================
  // ADMIN - INVENTARIO COMPLETO PARA REPORTES
  // =========================================================
  listarInventarioParaReportes(): Observable<ProductoTalla[]> {
    return this.http.get<ProductoTalla[]>(
      `${this.apiUrl}/admin/reportes/inventario`
    );
  }

  // =========================================================
  // ADMIN - REGISTRAR TALLA PARA PRODUCTO
  // =========================================================
  registrar(idProducto: number, idTalla: number, stock: number): Observable<ProductoTalla> {
    const params = new HttpParams()
      .set('idProducto', idProducto.toString())
      .set('idTalla', idTalla.toString())
      .set('stock', stock.toString());

    return this.http.post<ProductoTalla>(
      `${this.apiUrl}/admin`,
      null,
      { params }
    );
  }

  // =========================================================
  // ADMIN - ACTUALIZAR STOCK
  // =========================================================
  actualizarStock(idProductoTalla: number, stock: number): Observable<ProductoTalla> {
    const params = new HttpParams()
      .set('stock', stock.toString());

    return this.http.put<ProductoTalla>(
      `${this.apiUrl}/admin/${idProductoTalla}/stock`,
      null,
      { params }
    );
  }
}