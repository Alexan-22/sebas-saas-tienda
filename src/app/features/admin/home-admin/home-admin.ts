import { environment } from '../../../../environments/environment';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HomeBanner, HomeColeccion } from '../../../core/models/home-contenido';
import { HomeContenidoService } from '../../../core/services/home-contenido';

@Component({
  selector: 'app-home-admin',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home-admin.html',
  styleUrl: './home-admin.css'
})
export class HomeAdmin implements OnInit, OnDestroy {
  private readonly uploadsUrl = `${environment.apiUrl}/uploads/`;

  // =========================================================
  // ESTADOS GENERALES
  // =========================================================
  cargando = true;
  error = '';
  mensaje = '';

  // =========================================================
  // BANNERS
  // =========================================================
  banners: HomeBanner[] = [];
  guardandoBanner: number | null = null;
  eliminandoBanner: number | null = null;
  creandoBanner = false;

  archivosBanners = new Map<number, File>();
  previewsBanners = new Map<number, string>();
  erroresBanners = new Map<number, string>();

  // =========================================================
  // COLECCIONES
  // =========================================================
  colecciones: HomeColeccion[] = [];
  guardandoColeccion: number | null = null;
  eliminandoColeccion: number | null = null;
  creandoColeccion = false;

  archivosColecciones = new Map<number, File>();
  previewsColecciones = new Map<number, string>();
  erroresColecciones = new Map<number, string>();

  constructor(
    private homeService: HomeContenidoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.previewsBanners.forEach(preview => this.liberarPreview(preview));
    this.previewsColecciones.forEach(preview => this.liberarPreview(preview));
  }

  // =========================================================
  // CARGAR DATOS
  // =========================================================
  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.mensaje = '';
    let bannersTerminados = false;
    let coleccionesTerminadas = false;

    const finalizarCarga = (): void => {
      if (bannersTerminados && coleccionesTerminadas) {
        this.cargando = false;
        this.actualizarVista();
      }
    };

    this.homeService.listarBannersAdmin().subscribe({
      next: banners => {
        this.banners = [...banners].sort((a, b) => a.orden - b.orden);
        bannersTerminados = true;
        finalizarCarga();
      },
      error: error => {
        console.error('ERROR CARGANDO BANNERS:', error);
        this.error = 'No se pudieron cargar los banners.';
        bannersTerminados = true;
        finalizarCarga();
      }
    });

    this.homeService.listarColeccionesAdmin().subscribe({
      next: colecciones => {
        this.colecciones = [...colecciones].sort((a, b) => a.orden - b.orden);
        coleccionesTerminadas = true;
        finalizarCarga();
      },
      error: error => {
        console.error('ERROR CARGANDO COLECCIONES:', error);
        this.error = 'No se pudieron cargar las colecciones.';
        coleccionesTerminadas = true;
        finalizarCarga();
      }
    });
  }

  // =========================================================
  // BANNERS (MÉTODOS)
  // =========================================================
  nuevoBanner(): void {
    if (this.creandoBanner) return;

    const titulo = window.prompt('Título del nuevo banner (obligatorio):', 'Nueva colección');
    if (titulo === null) return;
    if (!titulo.trim()) {
      this.error = 'Ingresa un título para crear el banner.';
      this.actualizarVista();
      return;
    }

    this.error = '';
    this.mensaje = '';
    this.creandoBanner = true;

    const nuevo: HomeBanner = {
      idBanner: 0,
      etiqueta: '',
      titulo: titulo.trim(),
      descripcion: '',
      textoBoton: '',
      enlaceBoton: '/tienda',
      imagen: null,
      orden: this.siguienteOrdenBanner(),
      estado: true
    };

    this.homeService.crearBanner(nuevo).subscribe({
      next: creado => {
        this.banners = [...this.banners, creado];
        this.ordenarBanners();
        this.creandoBanner = false;
        this.mensaje = 'Nuevo banner creado correctamente.';
        this.actualizarVista();
      },
      error: error => {
        console.error('ERROR CREANDO BANNER:', error);
        this.error = 'No se pudo crear el banner: ' + (typeof error?.error === 'string' ? error.error.slice(0, 240) : (error?.error?.detail ?? error?.error?.message ?? `HTTP ${error.status || 'desconocido'}`));
        this.creandoBanner = false;
        this.actualizarVista();
      }
    });
  }

  guardarBanner(banner: HomeBanner): void {
    this.error = '';
    this.mensaje = '';

    banner.titulo = (banner.titulo ?? '').trim();
    if (!banner.titulo) {
      this.error = 'El título del banner es obligatorio.';
      this.actualizarVista();
      return;
    }

    if (banner.orden == null || banner.orden < 1) {
      this.error = 'El orden del banner debe ser mayor a 0.';
      this.actualizarVista();
      return;
    }

    this.guardandoBanner = banner.idBanner;
    this.actualizarVista();

    this.homeService.actualizarBanner(banner.idBanner, banner).subscribe({
      next: actualizado => {
        this.reemplazarBanner(actualizado);
        const archivo = this.archivoBanner(actualizado.idBanner);

        if (archivo) {
          this.subirImagenBanner(actualizado, archivo);
          return;
        }

        this.guardandoBanner = null;
        this.ordenarBanners();
        this.mensaje = `Banner guardado correctamente.`;
        this.actualizarVista();
      },
      error: error => {
        console.error('ERROR ACTUALIZANDO BANNER:', error);
        this.error = 'No se pudo actualizar el banner.';
        this.guardandoBanner = null;
        this.actualizarVista();
      }
    });
  }

  // MÉTODO ELIMINAR BANNER MANTENIDO
  eliminarBanner(banner: HomeBanner): void {
    const confirmado = window.confirm(
      `¿Eliminar el banner con ID ${banner.idBanner}?\n\nEsta acción también eliminará su imagen y no se puede deshacer.`
    );

    if (!confirmado) return;

    this.error = '';
    this.mensaje = '';
    this.eliminandoBanner = banner.idBanner;
    this.actualizarVista();

    this.homeService.eliminarBanner(banner.idBanner).subscribe({
      next: () => {
        this.cancelarImagenBanner(banner.idBanner);
        this.banners = this.banners.filter(item => item.idBanner !== banner.idBanner);
        this.eliminandoBanner = null;
        this.mensaje = 'Banner eliminado correctamente.';
        this.actualizarVista();
      },
      error: error => {
        console.error('ERROR ELIMINANDO BANNER:', error);
        this.error = 'No se pudo eliminar el banner.';
        this.eliminandoBanner = null;
        this.actualizarVista();
      }
    });
  }

  seleccionarImagenBanner(event: Event, idBanner: number): void {
    this.erroresBanners.delete(idBanner);
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const archivo = input.files[0];
    const error = this.validarImagen(archivo);

    if (error) {
      this.erroresBanners.set(idBanner, error);
      input.value = '';
      this.actualizarVista();
      return;
    }

    const previewAnterior = this.previewsBanners.get(idBanner);
    this.liberarPreview(previewAnterior);
    this.archivosBanners.set(idBanner, archivo);
    this.previewsBanners.set(idBanner, URL.createObjectURL(archivo));
    this.actualizarVista();
  }

  cancelarImagenBanner(idBanner: number): void {
    const preview = this.previewsBanners.get(idBanner);
    this.liberarPreview(preview);
    this.archivosBanners.delete(idBanner);
    this.previewsBanners.delete(idBanner);
    this.erroresBanners.delete(idBanner);
  }

  imagenBannerUrl(banner: HomeBanner): string | null {
    const preview = this.previewsBanners.get(banner.idBanner);
    if (preview) return preview;
    if (banner.imagen) return this.uploadsUrl + banner.imagen;
    return null;
  }

  archivoBanner(idBanner: number): File | null {
    return this.archivosBanners.get(idBanner) ?? null;
  }

  errorBanner(idBanner: number): string {
    return this.erroresBanners.get(idBanner) ?? '';
  }

  private subirImagenBanner(banner: HomeBanner, archivo: File): void {
    this.homeService.subirImagenBanner(banner.idBanner, archivo).subscribe({
      next: actualizado => {
        this.reemplazarBanner(actualizado);
        this.cancelarImagenBanner(actualizado.idBanner);
        this.guardandoBanner = null;
        this.ordenarBanners();
        this.mensaje = 'Imagen de banner actualizada correctamente.';
        this.actualizarVista();
      },
      error: error => {
        console.error('ERROR SUBIENDO IMAGEN BANNER:', error);
        this.error = 'No se pudo subir la imagen del banner: ' + (typeof error?.error === 'string' ? error.error.slice(0, 240) : (error?.error?.detail ?? error?.error?.message ?? `HTTP ${error.status || 'desconocido'}`));
        this.guardandoBanner = null;
        this.actualizarVista();
      }
    });
  }

  private reemplazarBanner(actualizado: HomeBanner): void {
    const indice = this.banners.findIndex(item => item.idBanner === actualizado.idBanner);
    if (indice >= 0) this.banners[indice] = actualizado;
  }

  private ordenarBanners(): void {
    this.banners = [...this.banners].sort((a, b) => a.orden - b.orden);
  }

  private siguienteOrdenBanner(): number {
    if (this.banners.length === 0) return 1;
    return Math.max(...this.banners.map(banner => banner.orden || 0)) + 1;
  }

  // =========================================================
  // COLECCIONES (MÉTODOS)
  // =========================================================
  nuevaColeccion(): void {
    if (this.creandoColeccion) return;

    const titulo = window.prompt('Título de la nueva colección (obligatorio):', 'Moda Mujer');
    if (titulo === null) return;
    if (!titulo.trim()) {
      this.error = 'Ingresa un título para crear la colección.';
      this.actualizarVista();
      return;
    }

    this.error = '';
    this.mensaje = '';
    this.creandoColeccion = true;

    const nueva: HomeColeccion = {
      idColeccion: 0,
      titulo: titulo.trim(),
      etiqueta: '',
      textoBoton: '',
      enlace: '/tienda',
      imagen: null,
      orden: this.siguienteOrdenColeccion(),
      estado: true
    };

    this.homeService.crearColeccion(nueva).subscribe({
      next: creada => {
        this.colecciones = [...this.colecciones, creada];
        this.ordenarColecciones();
        this.creandoColeccion = false;
        this.mensaje = 'Nueva colección creada correctamente.';
        this.actualizarVista();
      },
      error: error => {
        console.error('ERROR CREANDO COLECCIÓN:', error);
        this.error = 'No se pudo crear la colección: ' + (typeof error?.error === 'string' ? error.error.slice(0, 240) : (error?.error?.detail ?? error?.error?.message ?? `HTTP ${error.status || 'desconocido'}`));
        this.creandoColeccion = false;
        this.actualizarVista();
      }
    });
  }

  guardarColeccion(coleccion: HomeColeccion): void {
    this.error = '';
    this.mensaje = '';

    coleccion.titulo = coleccion.titulo ? coleccion.titulo.trim() : '';
    if (!coleccion.titulo) {
      this.error = 'El título de la colección es obligatorio.';
      this.actualizarVista();
      return;
    }

    if (coleccion.orden == null || coleccion.orden < 1) {
      this.error = 'El orden debe ser mayor a 0.';
      this.actualizarVista();
      return;
    }

    this.guardandoColeccion = coleccion.idColeccion;
    this.actualizarVista();

    this.homeService.actualizarColeccion(coleccion).subscribe({
      next: actualizada => {
        this.reemplazarColeccion(actualizada);
        const archivo = this.archivoColeccion(actualizada.idColeccion);

        if (archivo) {
          this.subirImagenColeccion(actualizada, archivo);
          return;
        }

        this.guardandoColeccion = null;
        this.ordenarColecciones();
        this.mensaje = 'Colección actualizada correctamente.';
        this.actualizarVista();
      },
      error: error => {
        console.error('ERROR ACTUALIZANDO COLECCIÓN:', error);
        this.error = 'No se pudo actualizar la colección.';
        this.guardandoColeccion = null;
        this.actualizarVista();
      }
    });
  }

  // MÉTODO ELIMINAR COLECCIÓN MANTENIDO
  eliminarColeccion(coleccion: HomeColeccion): void {
    const verTitulo = coleccion.titulo ? `"${coleccion.titulo}"` : `ID ${coleccion.idColeccion}`;
    const confirmado = window.confirm(
      `¿Eliminar la colección ${verTitulo}?\n\nEsta acción también eliminará su imagen y no se puede deshacer.`
    );

    if (!confirmado) return;

    this.error = '';
    this.mensaje = '';
    this.eliminandoColeccion = coleccion.idColeccion;
    this.actualizarVista();

    this.homeService.eliminarColeccion(coleccion.idColeccion).subscribe({
      next: () => {
        this.cancelarImagenColeccion(coleccion.idColeccion);
        this.colecciones = this.colecciones.filter(item => item.idColeccion !== coleccion.idColeccion);
        this.eliminandoColeccion = null;
        this.mensaje = 'Colección eliminada correctamente.';
        this.actualizarVista();
      },
      error: error => {
        console.error('ERROR ELIMINANDO COLECCIÓN:', error);
        this.error = 'No se pudo eliminar la colección.';
        this.eliminandoColeccion = null;
        this.actualizarVista();
      }
    });
  }

  seleccionarImagenColeccion(event: Event, idColeccion: number): void {
    this.erroresColecciones.delete(idColeccion);
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const archivo = input.files[0];
    const error = this.validarImagen(archivo);

    if (error) {
      this.erroresColecciones.set(idColeccion, error);
      input.value = '';
      this.actualizarVista();
      return;
    }

    const previewAnterior = this.previewsColecciones.get(idColeccion);
    this.liberarPreview(previewAnterior);
    this.archivosColecciones.set(idColeccion, archivo);
    this.previewsColecciones.set(idColeccion, URL.createObjectURL(archivo));
    this.actualizarVista();
  }

  cancelarImagenColeccion(idColeccion: number): void {
    const preview = this.previewsColecciones.get(idColeccion);
    this.liberarPreview(preview);
    this.archivosColecciones.delete(idColeccion);
    this.previewsColecciones.delete(idColeccion);
    this.erroresColecciones.delete(idColeccion);
  }

  imagenColeccionUrl(coleccion: HomeColeccion): string | null {
    const preview = this.previewsColecciones.get(coleccion.idColeccion);
    if (preview) return preview;
    if (coleccion.imagen) return this.uploadsUrl + coleccion.imagen;
    return null;
  }

  archivoColeccion(idColeccion: number): File | null {
    return this.archivosColecciones.get(idColeccion) ?? null;
  }

  errorColeccion(idColeccion: number): string {
    return this.erroresColecciones.get(idColeccion) ?? '';
  }

  private subirImagenColeccion(coleccion: HomeColeccion, archivo: File): void {
    this.homeService.subirImagenColeccion(coleccion.idColeccion, archivo).subscribe({
      next: actualizada => {
        this.reemplazarColeccion(actualizada);
        this.cancelarImagenColeccion(actualizada.idColeccion);
        this.guardandoColeccion = null;
        this.ordenarColecciones();
        this.mensaje = 'Colección e imagen actualizadas correctamente.';
        this.actualizarVista();
      },
      error: error => {
        console.error('ERROR SUBIENDO IMAGEN COLECCIÓN:', error);
        this.error = 'No se pudo subir la imagen de la colección: ' + (typeof error?.error === 'string' ? error.error.slice(0, 240) : (error?.error?.detail ?? error?.error?.message ?? `HTTP ${error.status || 'desconocido'}`));
        this.guardandoColeccion = null;
        this.actualizarVista();
      }
    });
  }

  private reemplazarColeccion(actualizada: HomeColeccion): void {
    const indice = this.colecciones.findIndex(item => item.idColeccion === actualizada.idColeccion);
    if (indice >= 0) this.colecciones[indice] = actualizada;
  }

  private ordenarColecciones(): void {
    this.colecciones = [...this.colecciones].sort((a, b) => a.orden - b.orden);
  }

  private siguienteOrdenColeccion(): number {
    if (this.colecciones.length === 0) return 1;
    return Math.max(...this.colecciones.map(coleccion => coleccion.orden || 0)) + 1;
  }

  private validarImagen(archivo: File): string {
    const nombre = archivo.name.toLowerCase();
    const extensionValida = /\.(jpg|jpeg|jfif|png|webp)$/.test(nombre);

    const tiposPermitidos = [
      'image/jpeg',
      'image/jpg',
      'image/pjpeg',
      'image/png',
      'image/webp'
    ];

    const tipoValido = !archivo.type || tiposPermitidos.includes(archivo.type.toLowerCase());

    if (!extensionValida || !tipoValido) {
      return 'Solo se permiten imágenes JPG, JPEG, JFIF, PNG o WEBP.';
    }

    if (archivo.size > 5 * 1024 * 1024) {
      return 'La imagen no puede superar los 5 MB.';
    }

    return '';
  }

  private liberarPreview(preview: string | null | undefined): void {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
  }

  private actualizarVista(): void {
    try {
      this.cdr.detectChanges();
    } catch {}
  }
}
