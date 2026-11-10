import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompraRequest, CompraResponse, VentaPosRequest, VentaPosResponse } from '../models/venta';
import { Venta, DetalleCompraResponse, DetalleVenta } from '../models/venta-detalle';

@Injectable({
  providedIn: 'root'
})
export class VentaService {
  private readonly apiUrl = `${environment.apiUrl}/api/ventas`;

  constructor(
    private http: HttpClient
  ) {}

  // =========================================================
  // CLIENTE - REALIZAR COMPRA ONLINE
  // =========================================================
  comprar(request: CompraRequest): Observable<CompraResponse> {
    return this.http.post<CompraResponse>(
      this.apiUrl,
      request
    );
  }

  // =========================================================
  // CLIENTE - MIS COMPRAS
  // =========================================================
  misCompras(): Observable<Venta[]> {
    return this.http.get<Venta[]>(
      `${this.apiUrl}/mis-compras`
    );
  }

  // =========================================================
  // ADMIN - TODAS LAS VENTAS
  // =========================================================
  listarTodas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(
      `${this.apiUrl}/admin`
    );
  }

  // =========================================================
  // ADMIN - DETALLES PARA REPORTES
  // =========================================================
  listarDetallesParaReportes(): Observable<DetalleVenta[]> {
    return this.http.get<DetalleVenta[]>(
      `${this.apiUrl}/admin/reportes/detalles`
    );
  }

  // =========================================================
  // CLIENTE - DETALLE DE SU COMPRA
  // =========================================================
  detalleVenta(idVenta: number): Observable<DetalleCompraResponse> {
    return this.http.get<DetalleCompraResponse>(
      `${this.apiUrl}/${idVenta}/detalle`
    );
  }

  // =========================================================
  // ADMIN - DETALLE DE CUALQUIER VENTA
  // =========================================================
  detalleVentaAdmin(idVenta: number): Observable<DetalleCompraResponse> {
    return this.http.get<DetalleCompraResponse>(
      `${this.apiUrl}/admin/${idVenta}/detalle`
    );
  }

  // =========================================================
  // ADMIN - VENTA PRESENCIAL / POS
  // =========================================================
  realizarVentaPos(request: VentaPosRequest): Observable<VentaPosResponse> {
    return this.http.post<VentaPosResponse>(
      `${this.apiUrl}/admin/pos`,
      request
    );
  }
}
