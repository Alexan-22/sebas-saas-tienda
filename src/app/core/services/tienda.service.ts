import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import type { TemaEditor } from './editor-tienda.service';
import { environment } from '../../../environments/environment';

export interface TiendaConfig {
  id: number;
  nombre: string;
  subdominio: string;
  colorPrimario: string;
  colorSecundario?: string | null;
  whatsapp?: string | null;
  descripcionComercial?: string | null;
  logoUrl: string | null;
  ruc?: string | null;
  telefonoSoporte?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TiendaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/tiendas`;
  readonly tiendaActual = signal<TiendaConfig | null>(null);

  actualizarConfiguracion(datos: TiendaConfigEditar): Observable<TiendaConfig> {
    return this.http.put<TiendaConfig>(`${this.apiUrl}/admin/config`, datos).pipe(
      tap(config => this.aplicarConfiguracion(config))
    );
  }

  subirLogo(archivo: File): Observable<TiendaConfig> {
    const form = new FormData();
    form.append('imagen', archivo);
    return this.http.post<TiendaConfig>(`${this.apiUrl}/admin/logo`, form).pipe(
      tap(config => this.aplicarConfiguracion(config))
    );
  }

  private readonly tema = signal<TemaEditor | null | undefined>(undefined);
  readonly colorPrimario = computed(() => this.tema()?.primario ?? this.tiendaActual()?.colorPrimario ?? '#171717');

  aplicarTema(tema?: TemaEditor | null): void {
    this.tema.set(tema);
    const config = this.tiendaActual();
    if (config) this.aplicarConfiguracion(config);
  }

  private aplicarConfiguracion(config: TiendaConfig): void {
    this.tiendaActual.set(config);
    const primario = this.tema()?.primario ?? config.colorPrimario;
    const color = /^#[0-9a-fA-F]{6}$/.test(primario) ? primario : '#171717';
    document.documentElement.style.setProperty('--color-primario', color);
    const valorSecundario = this.tema()?.secundario ?? config.colorSecundario ?? '';
    const secundario = /^#[0-9a-fA-F]{6}$/.test(valorSecundario) ? valorSecundario : '#ffffff';
    document.documentElement.style.setProperty('--color-secundario', secundario);
    const fuentes = { SANS: 'Arial, Helvetica, sans-serif', SERIF: 'Georgia, serif', MONO: 'monospace' };
    const tema = this.tema();
    const fuente = tema ? fuentes[tema.tipografia] : undefined;
    document.documentElement.style.setProperty('--fuente-tienda', fuente ?? 'Arial, Helvetica, sans-serif');
    document.documentElement.style.setProperty('--fuente-titulos', fuente ?? 'Georgia, serif');
  }

  cargarConfiguracion(): Observable<TiendaConfig> {
    // El dominio se resuelve y valida en Spring Boot; no confiamos en un ID del navegador.
    return this.http.get<TiendaConfig>(`${this.apiUrl}/config`).pipe(
      tap(config => {
        if (!config?.id || !config.nombre) throw new Error('Configuración de tienda inválida');
        this.aplicarConfiguracion(config);
      }),
      catchError(error => {
        this.tiendaActual.set(null);
        return throwError(() => error);
      })
    );
  }

  telefonoWhatsApp(): string | null {
    const tienda = this.tiendaActual();
    const telefono = (tienda?.whatsapp || tienda?.telefonoSoporte || '').replace(/\D/g, '');
    if (!telefono) return null;
    const numero = telefono.length === 9 ? `51${telefono}` : telefono;
    return /^\d{11,15}$/.test(numero) ? numero : null;
  }
}

export interface TiendaConfigEditar {
  nombre: string;
  colorPrimario: string;
  colorSecundario: string;
  telefonoSoporte: string;
  whatsapp: string;
  descripcionComercial: string;
}
