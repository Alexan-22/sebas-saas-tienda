import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export type VelocidadPromo = 'ESTATICA' | 'LENTA' | 'RAPIDA' | 'MUY_RAPIDA';
export type ModoPromo = 'ROTACION' | 'DESPLAZAMIENTO';
export type ClaveMenu = 'TODO' | 'MUJER' | 'HOMBRE' | 'NOVEDADES' | 'OFERTAS';
export interface SubmenuCabecera {
  texto: string;
  busqueda: string;
}

export interface MenuCabecera {
  clave: ClaveMenu;
  texto: string;
  visible: boolean;
  submenus?: SubmenuCabecera[] | null;
}
export interface CabeceraConfig {
  promoActiva: boolean;
  promoModo: ModoPromo;
  promoVelocidad: VelocidadPromo;
  promoMensajes: string[];
  menuItems: MenuCabecera[];
}
export const CABECERA_DEFAULT: CabeceraConfig = {
  promoActiva: true, promoModo: 'ROTACION', promoVelocidad: 'RAPIDA',
  promoMensajes: ['NUEVAS COLECCIONES · DESCUBRE TU ESTILO'],
  menuItems: [
    { clave: 'TODO', texto: 'Todo', visible: true },
    { clave: 'MUJER', texto: 'Mujer', visible: true },
    { clave: 'HOMBRE', texto: 'Hombre', visible: true },
    { clave: 'NOVEDADES', texto: 'Novedades', visible: true },
    { clave: 'OFERTAS', texto: 'Ofertas', visible: true }
  ]
};
export function parametrosMenu(clave: ClaveMenu): Record<string, string | boolean> {
  switch (clave) {
    case 'MUJER': return { generoNombre: 'Mujer' };
    case 'HOMBRE': return { generoNombre: 'Hombre' };
    case 'NOVEDADES': return { nuevo: true };
    case 'OFERTAS': return { ofertas: true };
    default: return {};
  }
}
export function intervaloPromo(velocidad: VelocidadPromo): number {
  switch (velocidad) {
    case 'ESTATICA': return 0;
    case 'LENTA': return 7000;
    case 'RAPIDA': return 4000;
    case 'MUY_RAPIDA': return 2000;
  }
}
export function duracionDesplazamiento(velocidad: VelocidadPromo): number {
  switch (velocidad) {
    case 'ESTATICA': return 0;
    case 'LENTA': return 30;
    case 'RAPIDA': return 18;
    case 'MUY_RAPIDA': return 9;
  }
}
export function textoContraste(hex: string): string {
  const color = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#171717';
  const canal = (x: number) => {
    const v = x / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = .2126 * canal(parseInt(color.slice(1, 3), 16))
    + .7152 * canal(parseInt(color.slice(3, 5), 16))
    + .0722 * canal(parseInt(color.slice(5, 7), 16));
  return lum > 0.179 ? '#171717' : '#FFFFFF';
}
@Injectable({ providedIn: 'root' })
export class CabeceraTiendaService {
  private readonly http = inject(HttpClient);
  private readonly ruta = `${environment.apiUrl}/api/v1/tiendas`;
  readonly cabecera = signal<CabeceraConfig>(structuredClone(CABECERA_DEFAULT));
  private solicitud?: Observable<CabeceraConfig>;

  asegurarCarga(): void {
    if (this.solicitud) return;
    this.solicitud = this.http.get<CabeceraConfig>(`${this.ruta}/cabecera`).pipe(
      tap(datos => this.cabecera.set(datos)),
      catchError(error => { this.solicitud = undefined; return throwError(() => error); }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.solicitud.subscribe({ error: () => { /* Se conserva vista predeterminada */ } });
  }

  actualizarPublico(): void {
    this.solicitud = undefined;
    this.asegurarCarga();
  }

  consultarAdmin(): Observable<CabeceraConfig> {
    return this.http.get<CabeceraConfig>(`${this.ruta}/admin/cabecera`).pipe(
      tap(datos => this.cabecera.set(datos))
    );
  }

  guardar(datos: CabeceraConfig): Observable<CabeceraConfig> {
    return this.http.put<CabeceraConfig>(`${this.ruta}/admin/cabecera`, datos).pipe(
      tap(config => { this.cabecera.set(config); this.solicitud = undefined; })
    );
  }
}
