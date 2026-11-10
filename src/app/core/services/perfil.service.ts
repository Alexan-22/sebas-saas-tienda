
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  Perfil,
  ActualizarPerfilRequest,
  CambiarContrasenaRequest
} from '../models/perfil';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {

  private readonly http = inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/api/perfil`;

  obtener(): Observable<Perfil> {
    return this.http.get<Perfil>(this.url);
  }

  actualizar(
    datos: ActualizarPerfilRequest
  ): Observable<Perfil> {
    return this.http.put<Perfil>(
      this.url,
      datos
    );
  }

  cambiarContrasena(
    datos: CambiarContrasenaRequest
  ): Observable<void> {
    return this.http.put<void>(
      `${this.url}/contrasena`,
      datos
    );
  }
}
