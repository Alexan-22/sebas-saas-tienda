
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  signal
} from '@angular/core';

import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { environment } from '../../../environments/environment';

import { ProductoService } from '../../core/services/producto';
import { HomeContenidoService } from '../../core/services/home-contenido';
import { TiendaService } from '../../core/services/tienda.service';

import {
  ContenidoEditor,
  EditorTiendaService,
  SECCIONES_HOME
} from '../../core/services/editor-tienda.service';

import { Producto } from '../../core/models/producto';
import {
  HomeBanner,
  HomeColeccion
} from '../../core/models/home-contenido';

import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { ProductCard } from '../../shared/components/product-card/product-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    NgTemplateOutlet,
    PromoBar,
    Navbar,
    Footer,
    ProductCard
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {

  readonly vistaPrevia = input<ContenidoEditor>();

  readonly diseno = signal<ContenidoEditor | null>(null);
  readonly disenoCargado = signal(false);

  readonly seccionesPorDefecto = SECCIONES_HOME;

  private readonly editor = inject(EditorTiendaService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly uploadsUrl =
    `${environment.apiUrl}/uploads/`;

  private intervaloCarrusel:
    ReturnType<typeof setInterval> | null = null;

  productos: Producto[] = [];
  banners: HomeBanner[] = [];
  colecciones: HomeColeccion[] = [];

  bannerActual = 0;

  cargando = true;
  cargandoBanners = true;
  cargandoColecciones = true;

  errorCarga = false;
  errorBanners = false;
  errorColecciones = false;

  constructor(
    private readonly productosService: ProductoService,
    private readonly homeService: HomeContenidoService,
    public readonly tiendaService: TiendaService
  ) {}

  // ==========================================
  // INICIO AUTOMATICO
  // ==========================================

  ngOnInit(): void {

    // Los productos no dependen de la carga
    // del diseño ni de los banners.
    this.cargarProductos();

    const vistaPrevia = this.vistaPrevia();

    if (vistaPrevia) {
      this.aplicarDiseno(vistaPrevia);
      return;
    }

    this.editor.publicado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: diseno => {
          this.aplicarDiseno(diseno);
        },
        error: error => {
          console.error(
            'Error cargando diseño público:',
            error
          );

          this.aplicarDiseno(null);
        }
      });
  }

  ngOnDestroy(): void {
    this.detenerCarrusel();
  }

  // ==========================================
  // PERSONALIZACION MULTI-TENANT
  // ==========================================

  private aplicarDiseno(
    diseno: ContenidoEditor | null
  ): void {

    this.diseno.set(diseno);

    this.tiendaService.aplicarTema(
      diseno?.tema ?? null
    );

    this.disenoCargado.set(true);

    const portada = diseno?.portada;

    // Compatibilidad con contenido tradicional
    // almacenado en el backend.
    if (!portada) {
      this.cargarBanners();
      this.cargarColecciones();
      this.cdr.markForCheck();
      return;
    }

    this.detenerCarrusel();

    this.banners = [...portada.banners]
      .filter(banner => banner.visible)
      .sort((a, b) => a.orden - b.orden)
      .map(banner => ({
        idBanner: banner.id,
        imagen: banner.escritorio,
        imagenMovil: banner.movil,
        orden: banner.orden,
        estado: true,
        titulo: banner.titulo ?? '',
        etiqueta: null,
        descripcion: null,
        textoBoton: null,
        enlaceBoton: null
      }));

    this.colecciones = [...portada.colecciones]
      .filter(coleccion => coleccion.visible)
      .sort((a, b) => a.orden - b.orden)
      .map(coleccion => ({
        ...coleccion,
        idColeccion: coleccion.id,
        estado: true
      }));

    this.bannerActual = 0;

    this.cargandoBanners = false;
    this.cargandoColecciones = false;

    this.errorBanners = false;
    this.errorColecciones = false;

    // Actualizar la interfaz sin hacer clic.
    this.cdr.markForCheck();

    this.iniciarCarrusel();
  }

  // ==========================================
  // PRODUCTOS
  // ==========================================

  cargarProductos(): void {

    this.cargando = true;
    this.errorCarga = false;
    this.cdr.markForCheck();

    this.productosService.listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: productos => {

          this.productos = (productos ?? [])
            .filter(p => p.estado !== false);

          this.cargando = false;
          this.errorCarga = false;

          // Notificar actualización de productos.
          this.cdr.markForCheck();
        },

        error: error => {

          console.error(
            'Error cargando productos:',
            error
          );

          this.productos = [];
          this.errorCarga = true;
          this.cargando = false;

          this.cdr.markForCheck();
        }

      });
  }

  // ==========================================
  // BANNERS
  // ==========================================

  cargarBanners(): void {

    this.detenerCarrusel();

    this.cargandoBanners = true;
    this.errorBanners = false;

    this.cdr.markForCheck();

    this.homeService.listarBannersPublicos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: banners => {

          this.banners = [...(banners ?? [])]
            .sort((a, b) => a.orden - b.orden);

          this.bannerActual = 0;

          this.cargandoBanners = false;
          this.errorBanners = false;

          // Actualización inmediata de Angular.
          this.cdr.markForCheck();

          this.iniciarCarrusel();
        },

        error: error => {

          console.error(
            'Error cargando banners:',
            error
          );

          this.banners = [];
          this.bannerActual = 0;

          this.errorBanners = true;
          this.cargandoBanners = false;

          this.cdr.markForCheck();
        }

      });
  }

  // ==========================================
  // COLECCIONES
  // ==========================================

  cargarColecciones(): void {

    this.cargandoColecciones = true;
    this.errorColecciones = false;

    this.cdr.markForCheck();

    this.homeService.listarColeccionesPublicas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: colecciones => {

          this.colecciones = [...(colecciones ?? [])]
            .sort((a, b) => a.orden - b.orden);

          this.cargandoColecciones = false;
          this.errorColecciones = false;

          this.cdr.markForCheck();
        },

        error: error => {

          console.error(
            'Error cargando colecciones:',
            error
          );

          this.colecciones = [];

          this.errorColecciones = true;
          this.cargandoColecciones = false;

          this.cdr.markForCheck();
        }

      });
  }

  // ==========================================
  // PRODUCTOS DESTACADOS
  // ==========================================

  get productosPortada(): Producto[] {

    const ordenados = [...this.productos]
      .sort(
        (a, b) =>
          Number(b.destacado) - Number(a.destacado) ||
          Number(b.nuevo) - Number(a.nuevo)
      );

    const mujeres = ordenados.filter(
      p => this.esGenero(p, 'mujer')
    );

    const hombres = ordenados.filter(
      p => this.esGenero(p, 'hombre')
    );

    const mezclados: Producto[] = [];

    for (let i = 0; i < 4; i++) {

      if (mujeres[i]) {
        mezclados.push(mujeres[i]);
      }

      if (hombres[i]) {
        mezclados.push(hombres[i]);
      }
    }

    const seleccion = mezclados.length
      ? mezclados
      : ordenados;

    const ids = new Set(
      seleccion.map(p => p.idProducto)
    );

    return [
      ...seleccion,
      ...ordenados.filter(
        p => !ids.has(p.idProducto)
      )
    ].slice(0, 8);
  }

  private esGenero(
    producto: Producto,
    genero: string
  ): boolean {

    return (
      producto.genero?.nombreGenero ?? ''
    )
      .trim()
      .toLocaleLowerCase('es')
      .includes(genero);
  }

  // ==========================================
  // URL DE IMAGENES
  // ==========================================

  imagenUrl(
    imagen: string | null | undefined
  ): string | null {

    if (!imagen?.trim()) {
      return null;
    }

    const valor = imagen.trim();

    // Imágenes externas o Supabase Storage.
    if (/^https?:\/\//i.test(valor)) {
      return valor;
    }

    const ruta = valor
      .replace(/^\/+/, '')
      .replace(/^uploads\//, '')
      .replace(/^productos\//, '');

    return this.uploadsUrl + ruta;
  }

  imagenBannerUrl(
    banner: HomeBanner
  ): string | null {
    return this.imagenUrl(banner.imagen);
  }

  imagenColeccionUrl(
    coleccion: HomeColeccion
  ): string | null {
    return this.imagenUrl(coleccion.imagen);
  }

  // ==========================================
  // CARRUSEL
  // ==========================================

  obtenerBannerActual(): HomeBanner | null {
    return this.banners[this.bannerActual] ?? null;
  }

  siguienteBanner(): void {
    this.moverBanner(1);
  }

  bannerAnterior(): void {
    this.moverBanner(-1);
  }

  private moverBanner(
    direccion: number
  ): void {

    if (this.banners.length < 2) {
      return;
    }

    this.bannerActual = (
      this.bannerActual +
      direccion +
      this.banners.length
    ) % this.banners.length;

    this.cdr.markForCheck();

    this.iniciarCarrusel();
  }

  irABanner(indice: number): void {

    if (
      indice < 0 ||
      indice >= this.banners.length
    ) {
      return;
    }

    this.bannerActual = indice;

    this.cdr.markForCheck();

    this.iniciarCarrusel();
  }

  private iniciarCarrusel(): void {

    this.detenerCarrusel();

    if (this.banners.length <= 1) {
      return;
    }

    this.intervaloCarrusel = setInterval(() => {

      this.bannerActual = (
        this.bannerActual + 1
      ) % this.banners.length;

      // Fundamental para que el carrusel avance
      // incluso cuando nadie toca la pantalla.
      this.cdr.markForCheck();

    }, 3000);
  }

  private detenerCarrusel(): void {

    if (this.intervaloCarrusel !== null) {
      clearInterval(this.intervaloCarrusel);
      this.intervaloCarrusel = null;
    }
  }

  // ==========================================
  // ENLACES
  // ==========================================

  enlaceBanner(
    banner: HomeBanner
  ): string {
    return this.enlaceSeguro(banner.enlaceBoton);
  }

  enlaceColeccion(
    coleccion: HomeColeccion
  ): string {
    return this.enlaceSeguro(coleccion.enlace);
  }

  private enlaceSeguro(
    ruta?: string | null
  ): string {

    if (
      !ruta ||
      !ruta.startsWith('/') ||
      ruta.startsWith('//') ||
      ruta.includes('\\')
    ) {
      return '/tienda';
    }

    return ruta;
  }
}
