import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { RecuperarAcceso } from './recuperar-acceso';
import { AuthService } from '../../core/services/auth';
import { environment } from '../../../environments/environment';
describe('Recuperacion de acceso sin persistir tokens', () => {
  let http: HttpTestingController;
  const cerrar = vi.fn();
  const base = environment.apiUrl + '/api/auth/password';
  beforeEach(() => {
    cerrar.mockReset();
    TestBed.configureTestingModule({
      imports: [RecuperarAcceso],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { logout: cerrar } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { fragment: '', data: { global: true } } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  it('solo informa envio generico tras 202, sin afirmar que una cuenta existe', () => {
    const page = TestBed.createComponent(RecuperarAcceso).componentInstance;
    page.correo = 'ficticio@example.test';
    page.enviar();
    const r = http.expectOne(base + '/forgot');
    expect(r.request.body).toEqual({ correo: 'ficticio@example.test' });
    r.flush({ message: 'Generico' }, { status: 202, statusText: 'Accepted' });
    expect(page.mensaje).toContain('Si la cuenta');
  });
  it('503 no se presenta como correo enviado', () => {
    const page = TestBed.createComponent(RecuperarAcceso).componentInstance;
    page.correo = 'ficticio@example.test';
    page.enviar();
    http.expectOne(base + '/forgot').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(page.mensaje).toBe('');
    expect(page.error).toContain('no disponible');
  });
  it('token de fragmento solo vive en memoria, se retira del URL y se usa una vez', () => {
    const token = 'x'.repeat(43);
    TestBed.inject(ActivatedRoute).snapshot.fragment = 'token=' + token;
    const page = TestBed.createComponent(RecuperarAcceso).componentInstance;
    expect(page.restablecer).toBe(true);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ fragment: '', replaceUrl: true }),
    );
    page.password = 'Nueva-Ficticia-2027';
    page.enviar();
    page.enviar();
    const r = http.expectOne(base + '/reset');
    expect(r.request.body.token).toBe(token);
    r.flush(null, { status: 204, statusText: 'No Content' });
    expect(page.password).toBe('');
    expect(page.finalizado).toBe(true);
    expect(cerrar).toHaveBeenCalledOnce();
    page.enviar();
    http.expectNone(base + '/reset');
    expect(localStorage.getItem('recovery-token')).toBeNull();
  });
  it('no envia passwords fuera del limite BCrypt UTF-8', () => {
    TestBed.inject(ActivatedRoute).snapshot.fragment = 'token=' + 'x'.repeat(43);
    const page = TestBed.createComponent(RecuperarAcceso).componentInstance;
    page.password = 'é'.repeat(37);
    page.enviar();
    expect(page.error).toBeTruthy();
    http.expectNone(base + '/reset');
  });
});
