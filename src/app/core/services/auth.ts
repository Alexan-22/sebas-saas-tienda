import { environment } from '../../../environments/environment';
import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, RegistroRequest } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;
  private readonly tokenKey = 'tienda-sebas-token';

  private readonly tokenSignal = signal<string | null>(
    this.cargarTokenInicial()
  );

  readonly autenticado = computed(() => {
    const token = this.tokenSignal();

    if (!token) {
      return false;
    }

    return !this.tokenExpirado(token);
  });

  constructor(
    private http: HttpClient
  ) {}

  // ==========================================
  // LOGIN TRADICIONAL
  // ==========================================
  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      request
    ).pipe(
      tap(response => {
        this.guardarSesion(response.token);
      })
    );
  }

  // ==========================================
  // LOGIN CON GOOGLE
  // ==========================================
   loginConGoogle(idToken: string): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(
    `${this.apiUrl}/google`,
    { idToken }
  ).pipe(
    tap(response => {
      this.guardarSesion(response.token);
    })
  );
  }

  // ==========================================
  // GUARDAR SESIÓN
  // ==========================================
  private guardarSesion(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.tokenSignal.set(token);
  }

  // ==========================================
  // REGISTRO
  // ==========================================
  registrar(request: RegistroRequest): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/registro`,
      request,
      {
        responseType: 'text'
      }
    );
  }

  // ==========================================
  // LOGOUT
  // ==========================================
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.tokenSignal.set(null);
  }

  // ==========================================
  // OBTENER TOKEN
  // ==========================================
  obtenerToken(): string | null {
    const token = this.tokenSignal();

    if (!token) {
      return null;
    }

    if (this.tokenExpirado(token)) {
      this.logout();
      return null;
    }

    return token;
  }

  // ==========================================
  // OBTENER CORREO
  // ==========================================
  obtenerCorreo(): string | null {
    const payload = this.obtenerPayload();

    if (!payload) {
      return null;
    }

    return (
      payload['sub'] ??
      payload['correo'] ??
      payload['email'] ??
      null
    );
  }

  // ==========================================
  // OBTENER ROL
  // ==========================================
  obtenerRol(): string | null {
    const payload = this.obtenerPayload();

    if (!payload) {
      return null;
    }

    return payload['rol'] ?? null;
  }

  // ==========================================
  // COMPROBAR EXPIRACIÓN
  // ==========================================
  tokenExpirado(token?: string): boolean {
    const tokenActual = token ?? this.tokenSignal();

    if (!tokenActual) {
      return true;
    }

    const payload = this.decodificarPayload(tokenActual);

    if (!payload) {
      return true;
    }

    const expiracion = payload['exp'];

    if (typeof expiracion !== 'number') {
      return true;
    }

    const ahora = Math.floor(Date.now() / 1000);

    return expiracion <= ahora;
  }

  // ==========================================
  // OBTENER PAYLOAD
  // ==========================================
  private obtenerPayload(): Record<string, any> | null {
    const token = this.tokenSignal();

    if (!token) {
      return null;
    }

    if (this.tokenExpirado(token)) {
      this.logout();
      return null;
    }

    return this.decodificarPayload(token);
  }

  // ==========================================
  // DECODIFICAR JWT
  // ==========================================
  private decodificarPayload(token: string): Record<string, any> | null {
    try {
      const partes = token.split('.');

      if (partes.length !== 3) {
        return null;
      }

      let payloadBase64 = partes[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      while (payloadBase64.length % 4) {
        payloadBase64 += '=';
      }

      const payloadJson = decodeURIComponent(
        Array.prototype.map
          .call(
            atob(payloadBase64),
            (caracter: string) => {
              return (
                '%' +
                (
                  '00' +
                  caracter
                    .charCodeAt(0)
                    .toString(16)
                ).slice(-2)
              );
            }
          )
          .join('')
      );

      return JSON.parse(payloadJson);
    } catch (error) {
      console.error(
        'No se pudo leer el token JWT:',
        error
      );

      return null;
    }
  }

  // ==========================================
  // CARGAR TOKEN AL INICIAR
  // ==========================================
  private cargarTokenInicial(): string | null {
    const token = localStorage.getItem(this.tokenKey);

    if (!token) {
      return null;
    }

    if (this.tokenExpiradoInicial(token)) {
      localStorage.removeItem(this.tokenKey);
      return null;
    }

    return token;
  }

  // ==========================================
  // VALIDAR TOKEN DURANTE INICIALIZACIÓN
  // ==========================================
  private tokenExpiradoInicial(token: string): boolean {
    const payload = this.decodificarPayload(token);

    if (!payload) {
      return true;
    }

    const expiracion = payload['exp'];

    if (typeof expiracion !== 'number') {
      return true;
    }

    const ahora = Math.floor(Date.now() / 1000);

    return expiracion <= ahora;
  }
}