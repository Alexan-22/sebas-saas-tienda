
import { TestBed } from '@angular/core/testing';
import { App } from './app';
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

  it('debe mostrar el router-outlet principal', async () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/tiendas/config').flush({
      id: 1, nombre: 'Tienda de prueba', subdominio: 'fixture', colorPrimario: '#171717', logoUrl: null
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
    expect(document.documentElement.style.getPropertyValue('--color-primario')).toBe('#334455');
    expect(document.documentElement.style.getPropertyValue('--fuente-tienda')).toBe('Georgia, serif');
  });

});
