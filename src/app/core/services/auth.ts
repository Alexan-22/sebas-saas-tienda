import { environment } from '../../../environments/environment';
import { Injectable, computed, signal, DestroyRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, RegistroRequest } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private expiracion:ReturnType<typeof setTimeout>|undefined;
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
  ) { inject(DestroyRef).onDestroy(()=>clearTimeout(this.expiracion)); }

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
    try { localStorage.removeItem(this.tokenKey); } catch { /* JWT nunca se rehidrata. */ }
    this.tokenSignal.set(token);
    clearTimeout(this.expiracion);
    const exp=this.decodificarPayload(token)?.['exp'];
    if(typeof exp==='number')this.expiracion=setTimeout(()=>this.logout(),Math.max(0,Math.min(exp*1000-Date.now(),2147483647)));
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
    clearTimeout(this.expiracion);
    const token=this.tokenSignal();
    try { localStorage.removeItem(this.tokenKey); } catch { /* JWT nunca se rehidrata. */ }
    this.tokenSignal.set(null);
    if(token&&!this.tokenExpirado(token)) this.http.post(this.apiUrl+'/logout',{}, {headers:{Authorization:'Bearer '+token}}).subscribe({error:()=>{}});
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

    return expiracion * 1000 <= Date.now();
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
    // Nunca rehidratar JWT legados desde almacenamiento persistente.
    try { localStorage.removeItem(this.tokenKey); } catch { /* JWT nunca se rehidrata. */ }
    return null;
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

    return expiracion * 1000 <= Date.now();
  }
}