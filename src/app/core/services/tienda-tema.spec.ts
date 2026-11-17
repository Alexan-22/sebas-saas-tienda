import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TiendaService, TiendaConfig } from './tienda.service';

describe('Prioridad de personalización de tienda', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    for (const property of ['--color-primario', '--color-secundario', '--fuente-tienda', '--fuente-titulos']) {
      document.documentElement.style.removeProperty(property);
    }
  });

  it.each([true, false])('mantiene colores de configuración independiente del orden de llegada (tema primero: %s)', temaPrimero => {
    const service = TestBed.inject(TiendaService);
    const tema = { primario: '#334455', secundario: '#ddeeff', tipografia: 'SERIF' as const };
    const aplicarTema = () => service.aplicarTema(tema);
    const cargar = () => {
      service.cargarConfiguracion().subscribe();
      TestBed.inject(HttpTestingController).expectOne('/api/v1/tiendas/config').flush({
        id: 1, nombre: 'A', subdominio: 'a', logoUrl: null,
        colorPrimario: '#963362', colorSecundario: '#f9e1ed'
      });
    };
    if (temaPrimero) { aplicarTema(); cargar(); } else { cargar(); aplicarTema(); }
    expect(service.colorPrimario()).toBe('#963362');
    expect(document.documentElement.style.getPropertyValue('--color-primario')).toBe('#963362');
    expect(document.documentElement.style.getPropertyValue('--color-secundario')).toBe('#f9e1ed');
    expect(document.documentElement.style.getPropertyValue('--fuente-tienda')).toBe('Georgia, serif');
  });

  it('utiliza los colores del tema cuando el contrato legado no trae colores de configuración', () => {
    const service = TestBed.inject(TiendaService);
    service.aplicarTema({ primario: '#334455', secundario: '#ddeeff', tipografia: 'SANS' });
    service.cargarConfiguracion().subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/tiendas/config').flush({
      id: 1, nombre: 'Legada', subdominio: 'legada', logoUrl: null
    } as TiendaConfig);
    expect(service.colorPrimario()).toBe('#334455');
    expect(document.documentElement.style.getPropertyValue('--color-primario')).toBe('#334455');
    expect(document.documentElement.style.getPropertyValue('--color-secundario')).toBe('#ddeeff');
  });
});
