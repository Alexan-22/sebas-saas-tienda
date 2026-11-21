import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompraRequest, CompraResponse } from '../models/venta';

export interface ClienteInvitado { nombres: string; apellidos: string; correo: string; telefono: string; }
export interface CompraInvitadoRequest extends CompraRequest { cliente: ClienteInvitado; }
export interface CompraInvitadoResponse { compra: CompraResponse; tokenAcceso: string; }

@Injectable({ providedIn: 'root' })
export class CheckoutInvitadoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/ventas/invitado`;
  comprar(request: CompraInvitadoRequest): Observable<CompraInvitadoResponse> {
    return this.http.post<CompraInvitadoResponse>(this.base, request);
  }
}