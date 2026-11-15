
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TiendaService } from './core/services/tienda.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('App - Sebas Collection', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App], providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('debe crear correctamente la aplicación', () => {
    const fixture = TestBed.createComponent(App);

    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    for (const property of ['--color-primario', '--color-secundario', '--fuente-tienda', '--fuente-titulos']) {
      document.documentElement.style.removeProperty(property);
    }
  });

  it.each([
    { id: 1, nombre: 'Boutique A', colorPrimario: '#a12752', colorSecundario: '#fbe9ef' },
    { id: 2, nombre: 'Boutique B', colorPrimario: '#235c71', colorSecundario: '#e1f5fa' }
  ])('carga el router y conserva la configuración dinámica de $nombre sobre el tema publicado', async config => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/tiendas/config').flush({
      ...config, subdominio: 'fixture', logoUrl: null
    });
    TestBed.inject(HttpTestingController).expectOne('/api/home/public/diseno').flush({
      tema: { primario: '#334455', secundario: '#ddeeff', tipografia: 'SERIF' }
    });
    await fixture.whenStable();
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).verify();

    const compiled = fixture.nativeElement as HTMLElement;

    const routerOutlet = compiled.querySelector('router-outlet');

    expect(routerOutlet).not.toBeNull();
    // Los colores guardados por el propietario tienen prioridad; el Editor aporta la tipografía.
    expect(document.documentElement.style.getPropertyValue('--color-primario')).toBe(config.colorPrimario);
    expect(document.documentElement.style.getPropertyValue('--color-secundario')).toBe(config.colorSecundario);
    expect(TestBed.inject(TiendaService).colorPrimario()).toBe(config.colorPrimario);
    expect(document.documentElement.style.getPropertyValue('--fuente-tienda')).toBe('Georgia, serif');
  });

  it('recupera los colores guardados desde HTTP tras recrear la aplicación', async () => {
    const config = { id: 3, nombre: 'Boutique recarga', subdominio: 'recarga',
      colorPrimario: '#846a21', colorSecundario: '#fff6d4', logoUrl: null };
    for (let carga = 0; carga < 2; carga++) {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const http = TestBed.inject(HttpTestingController);
      http.expectOne('/api/v1/tiendas/config').flush(config);
      http.expectOne('/api/home/public/diseno').flush({
        tema: { primario: '#334455', secundario: '#ddeeff', tipografia: 'SANS' }
      });
      await fixture.whenStable();
      expect(document.documentElement.style.getPropertyValue('--color-primario')).toBe(config.colorPrimario);
      expect(document.documentElement.style.getPropertyValue('--color-secundario')).toBe(config.colorSecundario);
      http.verify();
      fixture.destroy();
      if (carga === 0) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({ imports: [App],
          providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
        document.documentElement.style.removeProperty('--color-primario');
        expect(TestBed.inject(TiendaService).tiendaActual()).toBeNull();
      }
    }
  });

});
