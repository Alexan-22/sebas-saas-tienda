import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UsuarioAdmin } from '../models/usuario-admin';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly apiUrl = `${environment.apiUrl}/api/usuarios`;

  constructor(
    private http: HttpClient
  ) {}

  // =========================================================
  // ADMIN - LISTAR USUARIOS
  // =========================================================
  listarTodos(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(
      `${this.apiUrl}/admin`
    );
  }

  // =========================================================
  // ADMIN - BUSCAR POR ID
  // =========================================================
  buscarPorId(idUsuario: number): Observable<UsuarioAdmin> {
    return this.http.get<UsuarioAdmin>(
      `${this.apiUrl}/admin/${idUsuario}`
    );
  }

  // =========================================================
  // ADMIN - CAMBIAR ESTADO
  // =========================================================
  cambiarEstado(idUsuario: number, estado: boolean): Observable<UsuarioAdmin> {
    const params = new HttpParams()
      .set('estado', estado.toString());

    return this.http.put<UsuarioAdmin>(
      `${this.apiUrl}/admin/${idUsuario}/estado`,
      null,
      { params }
    );
  }
}