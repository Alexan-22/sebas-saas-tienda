
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

  cargando = true;
  error = '';
  mensaje = '';

  banners: HomeBanner[] = [];
  guardandoBanner: number | null = null;
  eliminandoBanner: number | null = null;
  creandoBanner = false;

  archivosBanners = new Map<number, File>();
  previewsBanners = new Map<number, string>();
  erroresBanners = new Map<number, string>();

  colecciones: HomeColeccion[] = [];
  guardandoColeccion: number | null = null;
  eliminandoColeccion: number | null = null;
  creandoColeccion = false;

  archivosColecciones = new Map<number, File>();
  previewsColecciones = new Map<number, string>();
  erroresColecciones = new Map<number, string>();

  constructor(
    private readonly homeService: HomeContenidoService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.previewsBanners.forEach(url => this.liberarPreview(url));
    this.previewsColecciones.forEach(url => this.liberarPreview(url));
  }

  private actualizarVista(): void {
    this.cdr.detectChanges();
  }

  private mensajeError(error: any): string {
    if (typeof error?.error === 'string') {
      return error.error.slice(0, 240);
    }
    return error?.error?.detail ??
      error?.error?.message ??
      `HTTP ${error?.status ?? 'desconocido'}`;
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.mensaje = '';

    let bannersTerminados = false;
    let coleccionesTerminadas = false;

    const finalizar = () => {
      if (bannersTerminados && coleccionesTerminadas) {
        this.cargando = false;
        this.actualizarVista();
      }
    };

    this.homeService.listarBannersAdmin().subscribe({
      next: datos => {
        this.banners = [...(datos ?? [])].sort(
          (a, b) => a.orden - b.orden
        );
        bannersTerminados = true;
        finalizar();
      },
      error: error => {
        this.error = `No se pudieron cargar los banners. ${this.mensajeError(error)}`;
        bannersTerminados = true;
        finalizar();
      }
    });

    this.homeService.listarColeccionesAdmin().subscribe({
      next: datos => {
        this.colecciones = [...(datos ?? [])].sort(
          (a, b) => a.orden - b.orden
        );
        coleccionesTerminadas = true;
        finalizar();
      },
      error: error => {
        this.error = `No se pudieron cargar las colecciones. ${this.mensajeError(error)}`;
        coleccionesTerminadas = true;
        finalizar();
      }
    });
  }

  // =====================================================
  // BANNERS
  // =====================================================

  nuevoBanner(): void {
    if (this.creandoBanner) return;

    this.error = '';
    this.mensaje = '';
    this.creandoBanner = true;

    const nuevo: HomeBanner = {
      idBanner: 0,
      titulo: '',
      etiqueta: '',
      descripcion: '',
      textoBoton: '',
      enlaceBoton: '',
      imagen: null,
      orden: this.siguienteOrdenBanner(),
      estado: true
    };

    this.homeService.crearBanner(nuevo).subscribe({
      next: creado => {
        this.banners = [...this.banners, creado];
        this.ordenarBanners();
        this.creandoBanner = false;
        this.mensaje = 'Banner creado. Selecciona una imagen y guárdala.';
        this.actualizarVista();
      },
      error: error => {
        this.creandoBanner = false;
        this.error = `No se pudo crear el banner: ${this.mensajeError(error)}`;
        this.actualizarVista();
      }
    });
  }

  guardarBanner(banner: HomeBanner): void {
    if (this.guardandoBanner !== null) return;

    this.error = '';
    this.mensaje = '';

    if (!Number.isInteger(Number(banner.orden)) ||
        Number(banner.orden) < 1) {
      this.error = 'El orden debe ser un número entero mayor a cero.';
      this.actualizarVista();
      return;
    }

    banner.titulo = (banner.titulo ?? '').trim();
    banner.etiqueta = (banner.etiqueta ?? '').trim();
    banner.descripcion = (banner.descripcion ?? '').trim();

    // Los controles de botón y enlace ya no se muestran.
    banner.textoBoton = '';
    banner.enlaceBoton = '';

    this.guardandoBanner = banner.idBanner;
    this.actualizarVista();

    this.homeService.actualizarBanner(banner.idBanner, banner).subscribe({
      next: actualizado => {
        this.reemplazarBanner(actualizado);

        const archivo = this.archivoBanner(banner.idBanner);
        if (archivo) {
          this.subirImagenBanner(actualizado, archivo);
          return;
        }

        this.guardandoBanner = null;
        this.ordenarBanners();
        this.mensaje = 'Banner guardado correctamente.';
        this.actualizarVista();
      },
      error: error => {
        this.guardandoBanner = null;
        this.error = `No se pudo guardar el banner: ${this.mensajeError(error)}`;
        this.actualizarVista();
      }
    });
  }

  eliminarBanner(banner: HomeBanner): void {
    if (!window.confirm(
      `¿Eliminar el banner #${banner.idBanner}? Esta acción no se puede deshacer.`
    )) return;

    this.error = '';
    this.mensaje = '';
    this.eliminandoBanner = banner.idBanner;

    this.homeService.eliminarBanner(banner.idBanner).subscribe({
      next: () => {
        this.cancelarImagenBanner(banner.idBanner);
        this.banners = this.banners.filter(
          item => item.idBanner !== banner.idBanner
        );
        this.eliminandoBanner = null;
        this.mensaje = 'Banner eliminado.';
        this.actualizarVista();
      },
      error: error => {
        this.eliminandoBanner = null;
        this.error = `No se pudo eliminar el banner: ${this.mensajeError(error)}`;
        this.actualizarVista();
      }
    });
  }

  seleccionarImagenBanner(event: Event, idBanner: number): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) return;

    const error = this.validarImagen(archivo);
    this.erroresBanners.delete(idBanner);

    if (error) {
      this.erroresBanners.set(idBanner, error);
      input.value = '';
      this.actualizarVista();
      return;
    }

    this.liberarPreview(this.previewsBanners.get(idBanner));
    this.archivosBanners.set(idBanner, archivo);
    this.previewsBanners.set(idBanner, URL.createObjectURL(archivo));
    this.actualizarVista();
  }

  cancelarImagenBanner(idBanner: number): void {
    this.liberarPreview(this.previewsBanners.get(idBanner));
    this.previewsBanners.delete(idBanner);
    this.archivosBanners.delete(idBanner);
    this.erroresBanners.delete(idBanner);
    this.actualizarVista();
  }

  imagenBannerUrl(banner: HomeBanner): string | null {
    const preview = this.previewsBanners.get(banner.idBanner);
    if (preview) return preview;

    return banner.imagen
      ? this.uploadsUrl + banner.imagen
      : null;
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
        this.mensaje = 'Banner e imagen guardados correctamente.';
        this.actualizarVista();
      },
      error: error => {
        this.guardandoBanner = null;
        this.error = `No se pudo subir la imagen: ${this.mensajeError(error)}`;
        this.actualizarVista();
      }
    });
  }

  private reemplazarBanner(actualizado: HomeBanner): void {
    const indice = this.banners.findIndex(
      item => item.idBanner === actualizado.idBanner
    );

    if (indice >= 0) {
      this.banners[indice] = actualizado;
    }
  }

  private ordenarBanners(): void {
    this.banners = [...this.banners].sort(
      (a, b) => a.orden - b.orden
    );
  }

  private siguienteOrdenBanner(): number {
    return this.banners.length
      ? Math.max(...this.banners.map(b => b.orden || 0)) + 1
      : 1;
  }

  // =====================================================
  // COLECCIONES: funcionalidad original conservada
  // =====================================================

  
nuevaColeccion(): void {
  if (this.creandoColeccion) return;

  this.error = '';
  this.mensaje = '';
  this.creandoColeccion = true;

  const nueva: HomeColeccion = {
    idColeccion: 0,
    titulo: '',
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
      this.mensaje = 'Colección creada. Puedes agregar una imagen.';
      this.actualizarVista();
    },
    error: error => {
      this.creandoColeccion = false;
      this.error = `No se pudo crear la colección: ${this.mensajeError(error)}`;
      this.actualizarVista();
    }
  });
}


  guardarColeccion(coleccion: HomeColeccion): void {
    this.error = '';
    this.mensaje = '';

    coleccion.titulo = (coleccion.titulo ?? '').trim();

    if (!coleccion.titulo) {
      this.error = 'Ingresa un título para la colección.';
      this.actualizarVista();
      return;
    }

    if (!Number.isInteger(Number(coleccion.orden)) ||
        Number(coleccion.orden) < 1) {
      this.error = 'El orden debe ser mayor a cero.';
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
        this.mensaje = 'Colección guardada correctamente.';
        this.actualizarVista();
      },
      error: error => {
        this.guardandoColeccion = null;
        this.error = `No se pudo actualizar la colección: ${this.mensajeError(error)}`;
        this.actualizarVista();
      }
    });
  }

  eliminarColeccion(coleccion: HomeColeccion): void {
    if (!window.confirm(
      `¿Eliminar la colección #${coleccion.idColeccion}?`
    )) return;

    this.error = '';
    this.mensaje = '';
    this.eliminandoColeccion = coleccion.idColeccion;

    this.homeService.eliminarColeccion(coleccion.idColeccion).subscribe({
      next: () => {
        this.cancelarImagenColeccion(coleccion.idColeccion);
        this.colecciones = this.colecciones.filter(
          item => item.idColeccion !== coleccion.idColeccion
        );
        this.eliminandoColeccion = null;
        this.mensaje = 'Colección eliminada correctamente.';
        this.actualizarVista();
      },
      error: error => {
        this.eliminandoColeccion = null;
        this.error = `No se pudo eliminar la colección: ${this.mensajeError(error)}`;
        this.actualizarVista();
      }
    });
  }

  seleccionarImagenColeccion(event: Event, idColeccion: number): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) return;

    const error = this.validarImagen(archivo);
    this.erroresColecciones.delete(idColeccion);

    if (error) {
      this.erroresColecciones.set(idColeccion, error);
      input.value = '';
      this.actualizarVista();
      return;
    }

    this.liberarPreview(this.previewsColecciones.get(idColeccion));
    this.archivosColecciones.set(idColeccion, archivo);
    this.previewsColecciones.set(idColeccion, URL.createObjectURL(archivo));
    this.actualizarVista();
  }

  cancelarImagenColeccion(idColeccion: number): void {
    this.liberarPreview(this.previewsColecciones.get(idColeccion));
    this.previewsColecciones.delete(idColeccion);
    this.archivosColecciones.delete(idColeccion);
    this.erroresColecciones.delete(idColeccion);
    this.actualizarVista();
  }

  imagenColeccionUrl(coleccion: HomeColeccion): string | null {
    const preview = this.previewsColecciones.get(coleccion.idColeccion);
    if (preview) return preview;

    return coleccion.imagen
      ? this.uploadsUrl + coleccion.imagen
      : null;
  }

  archivoColeccion(idColeccion: number): File | null {
    return this.archivosColecciones.get(idColeccion) ?? null;
  }

  errorColeccion(idColeccion: number): string {
    return this.erroresColecciones.get(idColeccion) ?? '';
  }

  private subirImagenColeccion(
    coleccion: HomeColeccion,
    archivo: File
  ): void {
    this.homeService.subirImagenColeccion(
      coleccion.idColeccion,
      archivo
    ).subscribe({
      next: actualizada => {
        this.reemplazarColeccion(actualizada);
        this.cancelarImagenColeccion(actualizada.idColeccion);
        this.guardandoColeccion = null;
        this.ordenarColecciones();
        this.mensaje = 'Colección e imagen actualizadas.';
        this.actualizarVista();
      },
      error: error => {
        this.guardandoColeccion = null;
        this.error = `No se pudo subir la imagen: ${this.mensajeError(error)}`;
        this.actualizarVista();
      }
    });
  }

  private reemplazarColeccion(actualizada: HomeColeccion): void {
    const indice = this.colecciones.findIndex(
      item => item.idColeccion === actualizada.idColeccion
    );

    if (indice >= 0) {
      this.colecciones[indice] = actualizada;
    }
  }

  private ordenarColecciones(): void {
    this.colecciones = [...this.colecciones].sort(
      (a, b) => a.orden - b.orden
    );
  }

  private siguienteOrdenColeccion(): number {
    return this.colecciones.length
      ? Math.max(...this.colecciones.map(c => c.orden || 0)) + 1
      : 1;
  }

  // =====================================================
  // IMÁGENES
  // =====================================================

  private validarImagen(archivo: File): string {
    const extensionValida =
      /\.(jpg|jpeg|jfif|png|webp)$/i.test(archivo.name);

    const tipos = [
      'image/jpeg',
      'image/jpg',
      'image/pjpeg',
      'image/png',
      'image/webp'
    ];

    if (!extensionValida ||
        (archivo.type && !tipos.includes(archivo.type.toLowerCase()))) {
      return 'Solo se permiten JPG, JPEG, JFIF, PNG o WEBP.';
    }

    if (archivo.size === 0 ||
        archivo.size > 5 * 1024 * 1024) {
      return 'La imagen debe pesar entre 1 byte y 5 MB.';
    }

    return '';
  }

  private liberarPreview(url: string | null | undefined): void {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
