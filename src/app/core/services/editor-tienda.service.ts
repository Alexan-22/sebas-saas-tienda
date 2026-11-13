import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { CabeceraConfig } from './cabecera-tienda.service';
import type { FooterConfig } from './footer-tienda.service';

export const SECCIONES_HOME = ['BANNERS', 'CATEGORIAS', 'COLECCIONES', 'PRODUCTOS', 'CIERRE', 'BENEFICIOS'] as const;
export type SeccionHome = typeof SECCIONES_HOME[number];

export interface BannerEditor {
  id: number;
  orden: number;
  visible: boolean;
  escritorio: string | null;
  movil: string | null;
  titulo?: string | null;
}

export interface ColeccionEditor {
  id: number;
  orden: number;
  visible: boolean;
  titulo: string;
  imagen: string | null;
  etiqueta: string | null;
  textoBoton: string | null;
  enlace: string | null;
}

export interface PortadaEditor {
  banners: BannerEditor[];
  colecciones: ColeccionEditor[];
}

export interface TemaEditor {
  primario: string;
  secundario: string;
  tipografia: 'SANS' | 'SERIF' | 'MONO';
}

export interface ContenidoEditor {
  tema?: TemaEditor | null;
  portada?: PortadaEditor | null;
  seccionesHome: SeccionHome[];
  cabecera: CabeceraConfig;
  footer: FooterConfig;
}

export interface BorradorTienda {
  revision: number;
  contenido: ContenidoEditor;
}

export interface VersionTienda {
  version: number;
  publicadoEn: string;
  autor: string;
}

@Injectable({ providedIn: 'root' })
export class EditorTiendaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/tiendas/admin/editor`;

  obtener() {
    return this.http.get<BorradorTienda>(`${this.url}/borrador`);
  }

  guardar<K extends keyof ContenidoEditor>(bloque: K, revision: number, datos: ContenidoEditor[K]) {
    return this.http.put<BorradorTienda>(`${this.url}/borrador/${bloque}`, datos, { params: { revision } });
  }

  recursosHome() {
    return this.http.get<PortadaEditor>(`${this.url}/recursos-home`);
  }

  subirImagen(revision: number, destino: 'ESCRITORIO' | 'MOVIL' | 'COLECCION', id: number, archivo: File) {
    const datos = new FormData();
    datos.append('imagen', archivo);
    return this.http.post<BorradorTienda>(`${this.url}/borrador/portada/${destino}/${id}/imagen`, datos, {
      params: { revision }
    });
  }

  guardarHome(revision: number, secciones: SeccionHome[]) {
    return this.http.put<BorradorTienda>(`${this.url}/borrador/home`, secciones, { params: { revision } });
  }

  publicado() {
    return this.http.get<ContenidoEditor>(`${environment.apiUrl}/api/home/public/diseno`);
  }

  publicar(revision: number) {
    return this.http.post<BorradorTienda>(`${this.url}/publicar`, null, { params: { revision } });
  }

  historial() {
    return this.http.get<VersionTienda[]>(`${this.url}/versiones`);
  }

  restaurar(version: number, revision: number) {
    return this.http.post<BorradorTienda>(`${this.url}/versiones/${version}/restaurar`, null, {
      params: { revision }
    });
  }
}
