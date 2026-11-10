import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HomeBanner, HomeColeccion } from '../models/home-contenido';

@Injectable({
  providedIn: 'root'
})
export class HomeContenidoService {
  private readonly apiUrl = `${environment.apiUrl}/api/home`;

  constructor(
    private http: HttpClient
  ) {}

  // =========================================================
  // PÚBLICO - BANNERS
  // =========================================================
  listarBannersPublicos(): Observable<HomeBanner[]> {
    return this.http.get<HomeBanner[]>(
      `${this.apiUrl}/public/banners`
    );
  }

  // =========================================================
  // PÚBLICO - BANNER ANTIGUO
  // Compatibilidad temporal
  // =========================================================
  obtenerBannerPublico(): Observable<HomeBanner> {
    return this.http.get<HomeBanner>(
      `${this.apiUrl}/public/banner`
    );
  }

  // =========================================================
  // PÚBLICO - COLECCIONES
  // =========================================================
  listarColeccionesPublicas(): Observable<HomeColeccion[]> {
    return this.http.get<HomeColeccion[]>(
      `${this.apiUrl}/public/colecciones`
    );
  }

  // =========================================================
  // ADMIN - LISTAR BANNERS
  // =========================================================
  listarBannersAdmin(): Observable<HomeBanner[]> {
    return this.http.get<HomeBanner[]>(
      `${this.apiUrl}/admin/banners`
    );
  }

  // =========================================================
  // ADMIN - BUSCAR BANNER
  // =========================================================
  buscarBanner(idBanner: number): Observable<HomeBanner> {
    return this.http.get<HomeBanner>(
      `${this.apiUrl}/admin/banners/${idBanner}`
    );
  }

  // =========================================================
  // ADMIN - BANNER ANTIGUO
  // Compatibilidad temporal
  // =========================================================
  obtenerBannerAdmin(): Observable<HomeBanner> {
    return this.http.get<HomeBanner>(
      `${this.apiUrl}/admin/banner`
    );
  }

  // =========================================================
  // ADMIN - CREAR BANNER
  // =========================================================
  crearBanner(banner: HomeBanner): Observable<HomeBanner> {
    return this.http.post<HomeBanner>(
      `${this.apiUrl}/admin/banners`,
      banner
    );
  }

  // =========================================================
  // ADMIN - ACTUALIZAR BANNER
  // =========================================================
  actualizarBanner(idBanner: number, banner: HomeBanner): Observable<HomeBanner> {
    return this.http.put<HomeBanner>(
      `${this.apiUrl}/admin/banners/${idBanner}`,
      banner
    );
  }

  // =========================================================
  // ADMIN - SUBIR IMAGEN BANNER
  // =========================================================
  subirImagenBanner(idBanner: number, archivo: File): Observable<HomeBanner> {
    const formData = new FormData();
    formData.append('imagen', archivo);

    return this.http.post<HomeBanner>(
      `${this.apiUrl}/admin/banners/${idBanner}/imagen`,
      formData
    );
  }

  // =========================================================
  // ADMIN - ELIMINAR BANNER
  // =========================================================
  eliminarBanner(idBanner: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/admin/banners/${idBanner}`
    );
  }

  // =========================================================
  // ADMIN - LISTAR COLECCIONES
  // =========================================================
  listarColeccionesAdmin(): Observable<HomeColeccion[]> {
    return this.http.get<HomeColeccion[]>(
      `${this.apiUrl}/admin/colecciones`
    );
  }

  // =========================================================
  // ADMIN - BUSCAR COLECCIÓN
  // =========================================================
  buscarColeccion(idColeccion: number): Observable<HomeColeccion> {
    return this.http.get<HomeColeccion>(
      `${this.apiUrl}/admin/colecciones/${idColeccion}`
    );
  }

  // =========================================================
  // ADMIN - CREAR COLECCIÓN
  // =========================================================
  crearColeccion(coleccion: HomeColeccion): Observable<HomeColeccion> {
    return this.http.post<HomeColeccion>(
      `${this.apiUrl}/admin/colecciones`,
      coleccion
    );
  }

  // =========================================================
  // ADMIN - ACTUALIZAR COLECCIÓN
  // =========================================================
  actualizarColeccion(coleccion: HomeColeccion): Observable<HomeColeccion> {
    return this.http.put<HomeColeccion>(
      `${this.apiUrl}/admin/colecciones/${coleccion.idColeccion}`,
      coleccion
    );
  }

  // =========================================================
  // ADMIN - SUBIR IMAGEN COLECCIÓN
  // =========================================================
  subirImagenColeccion(idColeccion: number, archivo: File): Observable<HomeColeccion> {
    const formData = new FormData();
    formData.append('imagen', archivo);

    return this.http.post<HomeColeccion>(
      `${this.apiUrl}/admin/colecciones/${idColeccion}/imagen`,
      formData
    );
  }

  // =========================================================
  // ADMIN - ELIMINAR COLECCIÓN
  // =========================================================
  eliminarColeccion(idColeccion: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/admin/colecciones/${idColeccion}`
    );
  }
}