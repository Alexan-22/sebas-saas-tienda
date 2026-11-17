import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Reportes } from './reportes';
import { CsvExportService } from '../../../../../shared/export/csv-export.service';
import { authInterceptor } from '../../../../../core/interceptors/auth-interceptor';
import { AuthService } from '../../../../../core/services/auth';
import { construirCsv } from '../../../../../shared/export/csv-export';
import { datosFicticios } from '../../testing/reportes.fixture';
import { crearReportePdf } from '../../services/reportes-pdf';
import { ReportesPdfService } from '../../services/reportes-pdf.service';

describe('Reportes CSV: integración Angular, HTTP, filtros y permisos', () => {
  let fixture: ComponentFixture<Reportes>, page: Reportes, http: HttpTestingController;
  const csv = { descargar: vi.fn() },
    auth = { obtenerToken: vi.fn(), logout: vi.fn() };
  const pdfSpy = {
    crear: vi.fn((...args: Parameters<typeof crearReportePdf>) => {
      const doc = crearReportePdf(...args);
      vi.spyOn(doc, 'save').mockImplementation(() => doc);
      return doc;
    }),
  };
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T04:30:00Z'));
    csv.descargar.mockReset();
    pdfSpy.crear.mockClear();
    auth.logout.mockReset();
    auth.obtenerToken.mockReturnValue(
      'e30.' +
        btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600, nonce: crypto.randomUUID() })) +
        '.test',
    );
    TestBed.configureTestingModule({
      imports: [Reportes],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: CsvExportService, useValue: csv },
        { provide: ReportesPdfService, useValue: pdfSpy },
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(
              convertToParamMap({ vista: 'ventas', tienda_id: '999', tiendaId: '999' }),
            ),
          },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Reportes);
    page = fixture.componentInstance;
  });
  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  function cargar() {
    const d = datosFicticios();
    fixture.detectChanges();
    for (const [url, data] of [
      ['/api/ventas/admin', d.ventas],
      ['/api/productos/admin', d.productos],
      ['/api/usuarios/admin', d.usuarios],
    ] as const) {
      const req = http.expectOne(url);
      expect(req.request.params.keys()).toEqual([]);
      expect(req.request.headers.get('Authorization')).toBe('Bearer ' + auth.obtenerToken());
      req.flush(data);
    }
    http.expectOne('/api/ventas/admin/reportes/detalles').flush(d.detalles);
    http.expectOne('/api/producto-tallas/admin/reportes/inventario').flush(d.inventario);
    page.periodo = 'HOY';
    page.aplicarPeriodo();
    fixture.detectChanges();
    return d;
  }
  it('consulta solo endpoints de tienda sin tenant elegido por Angular y exporta el filtro visible', () => {
    cargar();
    page.exportarCSV();
    expect(csv.descargar).toHaveBeenCalledOnce();
    const [name, headers, rows, separator] = csv.descargar.mock.calls[0];
    expect(name).toContain('2026-11-13.csv');
    expect(rows.map((r: unknown[]) => r[0])).toEqual([1, 2, 6]);
    expect(separator).toBe(';');
    const text = construirCsv(headers, rows, separator);
    expect(text).not.toContain('privado@example');
    http.expectNone(
      (r) => r.url.includes('superadmin') || r.params.has('tiendaId') || r.params.has('tienda_id'),
    );
  });
  it('ofrece exclusivamente Exportar PDF y Exportar CSV, con 13 tablas en cuatro grupos', () => {
    cargar();
    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('.export-actions button'),
    ) as HTMLButtonElement[];
    expect(botones.map((b) => b.textContent!.trim())).toEqual(['Exportar CSV', 'Exportar PDF']);
    expect(fixture.nativeElement.querySelector('.export-excel')).toBeNull();
    expect('exportarExcel' in page).toBe(false);
    const grupos = Array.from(
      fixture.nativeElement.querySelectorAll('#reporteCsv optgroup'),
    ) as HTMLOptGroupElement[];
    expect(grupos.map((g) => g.label)).toEqual(['Ventas', 'Inventario', 'Pagos', 'Clientes']);
    expect(fixture.nativeElement.querySelectorAll('#reporteCsv option')).toHaveLength(13);
    botones[0].click();
    expect(csv.descargar).toHaveBeenCalledOnce();
  });
  it('los cobros consultan tres fuentes completas, no confirman pedidos pendientes ni duplican consulta', () => {
    const d = cargar();
    page.reporteCsv = 'cobros';
    page.exportarCSV();
    page.exportarCSV();
    expect(page.cargandoCsv).toBe(true);
    const reqs = http.match(
      (r) =>
        r.url === '/api/yape/pagos/admin/reportes' ||
        r.url === '/api/transferencias/pagos/admin/reportes' ||
        r.url === '/api/ventas/admin/contraentrega/reportes',
    );
    expect(reqs).toHaveLength(3);
    for (const req of reqs) {
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual(['size']);
      expect(req.request.headers.get('Authorization')).toBe('Bearer ' + auth.obtenerToken());
      const registros=(req.request.url.includes('/yape/')
          ? d.yape!
          : req.request.url.includes('/transferencias/')
            ? d.transferencias!
            : d.contraentrega!).slice().sort((a,b)=>b.idVenta-a.idVenta);
      req.flush({registros,siguienteCursor:null,hasMore:false});
    }
    expect(csv.descargar).toHaveBeenCalledOnce();
    expect(csv.descargar.mock.calls[0][2].map((r: unknown[]) => r[0])).toEqual([3, 6]);
    expect(page.cargandoCsv).toBe(false);
  });
  for (const status of [400, 401, 403, 404, 409, 503])
    it('HTTP ' + status + ' no genera CSV parcial de pagos', () => {
      cargar();
      page.reporteCsv = 'pagos';
      page.exportarCSV();
      const reqs = http.match(
        (r) => r.url.includes('/pagos/admin') || r.url === '/api/ventas/admin/contraentrega/reportes',
      );
      reqs[0].flush({}, { status, statusText: 'Error' });
      expect(csv.descargar).not.toHaveBeenCalled();
      expect(page.cargandoCsv).toBe(false);
      expect(page.errorCsv).toBeTruthy();
      if (status === 401) expect(auth.logout).toHaveBeenCalled();
    });
  it('fallo de sesión nueva bloquea exportar los datos anteriores', () => {
    cargar();
    auth.obtenerToken.mockReturnValue(
      'e30.' +
        btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600, nonce: crypto.randomUUID() })) +
        '.test',
    );
    page.cargarReportes();
    const reqs = http.match(() => true);
    reqs[0].flush({}, { status: 403, statusText: 'Forbidden' });
    page.exportarCSV();
    expect(csv.descargar).not.toHaveBeenCalled();
    expect(page.error).toBeTruthy();
  });
  it('destrucción de pantalla cancela las consultas antes de descargar', () => {
    cargar();
    page.reporteCsv = 'pagos';
    page.exportarCSV();
    const reqs = http.match(
      (r) => r.url.includes('/pagos/admin') || r.url === '/api/ventas/admin/contraentrega/reportes',
    );
    fixture.destroy();
    expect(reqs.every((r) => r.cancelled)).toBe(true);
    expect(csv.descargar).not.toHaveBeenCalled();
  });
  it('carga, error e inventario incompleto bloquean CSV', () => {
    page.exportarCSV();
    expect(csv.descargar).not.toHaveBeenCalled();
    page.cargando = false;
    page.error = 'Falló la consulta';
    page.exportarCSV();
    expect(csv.descargar).not.toHaveBeenCalled();
  });
  it('el boton PDF genera el documento con el mismo conjunto y periodo autorizado', () => {
    const d = cargar();
    const boton = fixture.nativeElement.querySelector('.export-pdf') as HTMLButtonElement;
    boton.click();
    expect(pdfSpy.crear).toHaveBeenCalledOnce();
    const [datos, contexto] = pdfSpy.crear.mock.calls[0];
    expect(datos.ventas).toEqual(d.ventas);
    expect(contexto.periodo).toBe('HOY');
    const doc = pdfSpy.crear.mock.results[0].value!;
    expect(doc.save).toHaveBeenCalledWith('reporte-general-hoy-2026-11-13.pdf');
    expect(doc.output()).toContain('America/Lima');
    expect(doc.output()).not.toContain('TENANT_B_NO_EXPORTAR');
  });
  it('carga, error o inventario incompleto impiden descargar tanto PDF como CSV', () => {
    page.exportarPDF();
    expect(pdfSpy.crear).not.toHaveBeenCalled();
    cargar();
    page.stockIncompleto = true;
    page.exportarPDF();
    page.exportarCSV();
    expect(pdfSpy.crear).not.toHaveBeenCalled();
    expect(csv.descargar).not.toHaveBeenCalled();
    page.stockIncompleto = false;
    page.error = 'Sin permiso';
    page.exportarPDF();
    expect(pdfSpy.crear).not.toHaveBeenCalled();
  });
  it('rechazo de recarga autenticada impide PDF anterior ademas de CSV', () => {
    cargar();
    page.cargarReportes();
    const reqs = http.match(() => true);
    reqs[0].flush({}, { status: 403, statusText: 'Forbidden' });
    page.exportarPDF();
    page.exportarCSV();
    expect(pdfSpy.crear).not.toHaveBeenCalled();
    expect(csv.descargar).not.toHaveBeenCalled();
  });
  it('una nueva respuesta autorizada reemplaza los datos anteriores en CSV y PDF (HTTP simulado)', () => {
    cargar();
    const d = datosFicticios();
    d.inventario[0].producto.nombre = 'SOLO_B';
    auth.obtenerToken.mockReturnValue(
      'e30.' +
        btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600, nonce: crypto.randomUUID() })) +
        '.test',
    );
    page.cargarReportes();
    for (const [url, data] of [
      ['/api/ventas/admin', d.ventas],
      ['/api/productos/admin', d.productos],
      ['/api/usuarios/admin', d.usuarios],
    ] as const) {
      const r = http.expectOne(url);
      expect(r.request.params.keys()).toEqual([]);
      expect(r.request.headers.get('Authorization')).toBe('Bearer ' + auth.obtenerToken());
      r.flush(data);
    }
    http.expectOne('/api/ventas/admin/reportes/detalles').flush(d.detalles);
    http.expectOne('/api/producto-tallas/admin/reportes/inventario').flush(d.inventario);
    page.reporteCsv = 'inventario';
    page.exportarCSV();
    page.exportarPDF();
    const texto = JSON.stringify(csv.descargar.mock.calls[0]);
    expect(texto).toContain('SOLO_B');
    expect(texto).not.toContain('Camisa');
    const doc = pdfSpy.crear.mock.results[0].value!;
    expect(doc.output()).toContain('SOLO_B');
    expect(doc.output()).not.toContain('Camisa');
    http.expectNone((r) => r.url.includes('superadmin'));
  });
});
