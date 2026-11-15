import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { leerPagosCompletos } from './pagos-completos';
describe('Reportes de pagos completos por cursor', () => {
  let http: HttpTestingController, client: HttpClient;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });
  afterEach(() => http.verify());
  const rows = (a: number, n: number) => Array.from({ length: n }, (_, i) => ({ idVenta: a - i }));
  it('recorre mas de 100/200 registros sin perder filas ni enviar tenant editable', () => {
    let result: unknown[] = [];
    leerPagosCompletos(client, '/api/yape/pagos/admin/reportes').subscribe((v) => (result = v));
    for (const [cursor, start, size] of [
      [undefined, 230, 100],
      [131, 130, 100],
      [31, 30, 30],
    ]) {
      const req = http.expectOne((r) => r.url === '/api/yape/pagos/admin/reportes');
      expect(req.request.params.has('tienda_id')).toBe(false);
      expect(req.request.params.has('tiendaId')).toBe(false);
      expect(req.request.params.get('cursor')).toBe(cursor === undefined ? null : String(cursor));
      req.flush({
        registros: rows(start!, size!),
        hasMore: size === 100,
        siguienteCursor: size === 100 ? start! - size! + 1 : null,
      });
    }
    expect(result).toHaveLength(230);
  });
  it('una segunda pagina fallida no emite un reporte parcial', () => {
    let emitted = false,
      error = 0;
    leerPagosCompletos(client, '/reportes').subscribe({
      next: () => (emitted = true),
      error: (e) => (error = e.status),
    });
    http
      .expectOne((r) => r.url === '/reportes')
      .flush({ registros: rows(200, 100), hasMore: true, siguienteCursor: 101 });
    http
      .expectOne((r) => r.url === '/reportes')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(emitted).toBe(false);
    expect(error).toBe(503);
  });
  it('rechaza duplicados, cursor incoherente y paginas sin metadatos', () => {
    for (const body of [
      { registros: [{ idVenta: 1 }, { idVenta: 1 }], hasMore: false, siguienteCursor: null },
      { registros: [{ idVenta: 2 }], hasMore: true, siguienteCursor: 1 },
      { registros: [] },
    ]) {
      let status = 0;
      leerPagosCompletos(client, '/reportes').subscribe({ error: (e) => (status = e.status) });
      http.expectOne((r) => r.url === '/reportes').flush(body);
      expect(status).toBe(409);
    }
  });
});
