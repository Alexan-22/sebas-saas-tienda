import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FooterConfig {
  descripcion: string;
  textoContacto: string;
  horario: string;
  correo: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  beneficiosActivos: boolean;
  beneficioEnvios: string;
  beneficioPagos: string;
  beneficioAtencion: string;
  newsletterActivo: boolean;
  newsletterTitulo: string;
  newsletterDescripcion: string;
  textoLegal: string;
}
export const FOOTER_DEFAULT: FooterConfig = {
  descripcion: 'Descubre prendas para expresar tu estilo, todos los días.',
  textoContacto: 'Estamos para ayudarte a elegir tu próximo look.',
  horario: '', correo: '', facebookUrl: '', instagramUrl: '', tiktokUrl: '',
  beneficiosActivos: true, beneficioEnvios: 'Envíos a todo el Perú',
  beneficioPagos: 'Compras seguras', beneficioAtencion: 'Atención personalizada',
  newsletterActivo: false, newsletterTitulo: 'Novedades de nuestra tienda',
  newsletterDescripcion: 'Síguenos en redes para conocer nuestras colecciones.',
  textoLegal: 'Todos los derechos reservados.'
};
@Injectable({providedIn: 'root'})
export class FooterTiendaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/tiendas`;
  readonly configuracion = signal<FooterConfig>({...FOOTER_DEFAULT});
  private cargado = false;
  cargarPublico(): void {
    if (this.cargado) return;
    this.cargado = true;
    this.http.get<FooterConfig>(`${this.base}/footer`).pipe(
      tap(v => this.configuracion.set(v)),
      catchError(e => { this.cargado = false; return throwError(() => e); })
    ).subscribe({error: () => { /* El footer predeterminado permanece visible */ }});
  }
  actualizarPublico(): void {
    this.cargado = false;
    this.cargarPublico();
  }

  consultarAdmin(): Observable<FooterConfig> {
    return this.http.get<FooterConfig>(`${this.base}/admin/footer`).pipe(
      tap(v => {this.configuracion.set(v); this.cargado = true;})
    );
  }
  guardar(v: FooterConfig): Observable<FooterConfig> {
    return this.http.put<FooterConfig>(`${this.base}/admin/footer`, v).pipe(
      tap(datos => {this.configuracion.set(datos); this.cargado = true;})
    );
  }
}
