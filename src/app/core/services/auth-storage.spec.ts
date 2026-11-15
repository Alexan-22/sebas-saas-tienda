import { provideRouter } from '@angular/router';
import { authInterceptor } from '../interceptors/auth-interceptor';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { AuthService } from './auth';
import { environment } from '../../../environments/environment';
describe('JWT en memoria y cierre de sesion', () => {
  let auth: AuthService, http: HttpTestingController;
  const jwt = () =>
    'e30.' +
    btoa(
      JSON.stringify({ exp: Date.now() / 1000 + 60, rol: 'CLIENTE', sub: 'ficticio@example.test' }),
    ) +
    '.fixture';
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });
  function login() {
    auth = TestBed.inject(AuthService);
    const token = jwt();
    auth.login({ correo: 'ficticio@example.test', password: 'Solo-ficticia-2026' }).subscribe();
    http
      .expectOne(environment.apiUrl + '/api/auth/login')
      .flush({ token, nombre: 'Ficticio', correo: 'ficticio@example.test', rol: 'CLIENTE' });
    return token;
  }
  it('purga JWT legado sin reutilizarlo ni llamar al servidor', () => {
    localStorage.setItem('tienda-sebas-token', jwt());
    auth = TestBed.inject(AuthService);
    expect(auth.obtenerToken()).toBeNull();
    expect(localStorage.getItem('tienda-sebas-token')).toBeNull();
  });
  it('el login conserva JWT solo en memoria y no sobrevive a otra instancia', () => {
    const token = login();
    expect(auth.obtenerToken()).toBe(token);
    expect(localStorage.getItem('tienda-sebas-token')).toBeNull();
    const otra = TestBed.runInInjectionContext(() => new AuthService(TestBed.inject(HttpClient)));
    expect(otra.obtenerToken()).toBeNull();
  });
  it('logout borra memoria y pide revocacion de esa sesion con Bearer explicito', () => {
    const token = login();
    auth.logout();
    expect(auth.obtenerToken()).toBeNull();
    const r = http.expectOne(environment.apiUrl + '/api/auth/logout');
    expect(r.request.headers.get('Authorization')).toBe('Bearer ' + token);
    r.flush(null, { status: 204, statusText: 'No Content' });
  });
  it('caducidad local limpia el estado aunque no se haga otra consulta', () => {
    vi.useFakeTimers();
    login();
    expect(auth.autenticado()).toBe(true);
    vi.advanceTimersByTime(61000);
    expect(auth.autenticado()).toBe(false);
    expect(auth.obtenerToken()).toBeNull();
  });
  it('un nuevo login no adjunta el JWT anterior ni lo escribe en almacenamiento', () => {
    login();
    auth.login({ correo: 'otro@example.test', password: 'Ficticia-2026' }).subscribe();
    const r = http.expectOne(environment.apiUrl + '/api/auth/login');
    expect(r.request.headers.has('Authorization')).toBe(false);
    r.flush({ token: jwt(), nombre: 'Otro', correo: 'otro@example.test', rol: 'CLIENTE' });
    expect(localStorage.getItem('tienda-sebas-token')).toBeNull();
  });
});
