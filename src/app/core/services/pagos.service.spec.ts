import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PagosService } from './pagos.service';
import { AuthService } from './auth';
import { authInterceptor } from '../interceptors/auth-interceptor';
import { tenantInterceptor } from '../interceptors/tenant.interceptor';

describe('PagosService contract', () => {
  let service: PagosService;
  let http: HttpTestingController;
  const token = `test.${btoa(JSON.stringify({exp: 4102444800}))}.fixture`;
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter([]),
      provideHttpClient(withInterceptors([tenantInterceptor, authInterceptor])), provideHttpClientTesting(),
      {provide: AuthService, useValue: {obtenerToken: () => token, logout: () => {}}}]});
    service = TestBed.inject(PagosService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends JWT to configuration without a tenant override', () => {
    service.configuracion().subscribe();
    const req = http.expectOne('/api/pagos/admin/configuracion');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(req.request.headers.has('X-Tenant-Domain')).toBe(false);
    req.flush({proveedor:'SANDBOX',habilitado:false,modo:'SANDBOX'});
  });
  it('updates only enabled flag', () => {
    service.actualizarConfiguracion(true).subscribe();
    const req=http.expectOne('/api/pagos/admin/configuracion');
    expect(req.request.method).toBe('PUT'); expect(req.request.body).toEqual({habilitado:true}); req.flush({});
  });
  it('uses zero based pagination', () => {
    service.listar(2).subscribe(value => expect(value).toEqual([]));
    http.expectOne('/api/pagos/admin?pagina=2').flush([]);
  });
  it('preserves missing detail response', () => {
    service.consultar('absent').subscribe({error: error => expect(error.status).toBe(404)});
    http.expectOne('/api/pagos/admin/absent').flush({}, {status:404,statusText:'Not Found'});
  });
});
