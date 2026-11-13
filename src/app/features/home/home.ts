import { Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ProductoService } from '../../core/services/producto';
import { HomeContenidoService } from '../../core/services/home-contenido';
import { TiendaService } from '../../core/services/tienda.service';
import { ContenidoEditor, EditorTiendaService, SECCIONES_HOME } from '../../core/services/editor-tienda.service';
import { Producto } from '../../core/models/producto';
import { HomeBanner, HomeColeccion } from '../../core/models/home-contenido';
import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { ProductCard } from '../../shared/components/product-card/product-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, PromoBar, Navbar, Footer, ProductCard],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {
  readonly vistaPrevia = input<ContenidoEditor>();
  readonly diseno = signal<ContenidoEditor | null>(null);
  readonly disenoCargado = signal(false);
  readonly seccionesPorDefecto = SECCIONES_HOME;
  private readonly editor = inject(EditorTiendaService);
  private readonly uploadsUrl = `${environment.apiUrl}/uploads/`;
  private intervaloCarrusel: ReturnType<typeof setInterval> | null = null;
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

  ngOnInit(): void {
    if (this.vistaPrevia()) {
      this.aplicarDiseno(this.vistaPrevia() ?? null);
    } else {
      this.editor.publicado().subscribe({
        next: diseno => {
          this.aplicarDiseno(diseno);
        },
        error: () => this.aplicarDiseno(null)
      });
    }
    this.cargarProductos();

  }
  ngOnDestroy(): void { this.detenerCarrusel(); }

  private aplicarDiseno(diseno: ContenidoEditor | null): void {
    this.diseno.set(diseno);
    this.disenoCargado.set(true);
    const portada = diseno?.portada;
    if (!portada) {
      this.cargarBanners();
      this.cargarColecciones();
      return;
    }

    this.banners = portada.banners.filter(banner => banner.visible).sort((a, b) => a.orden - b.orden)
      .map(banner => ({
        idBanner: banner.id, imagen: banner.escritorio, imagenMovil: banner.movil,
        orden: banner.orden, estado: true, titulo: banner.titulo ?? '', etiqueta: null,
        descripcion: null, textoBoton: null, enlaceBoton: null
      }));
    this.colecciones = portada.colecciones.filter(coleccion => coleccion.visible)
      .sort((a, b) => a.orden - b.orden)
      .map(coleccion => ({ ...coleccion, idColeccion: coleccion.id, estado: true }));
    this.cargandoBanners = false;
    this.cargandoColecciones = false;
    this.iniciarCarrusel();
  }

  cargarProductos(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.productosService.listar().subscribe({
      next: productos => {
        this.productos = (productos ?? []).filter(p => p.estado !== false);
        this.cargando = false;
      },
      error: error => {
        console.error('Error cargando productos:', error);
        this.productos = [];
        this.errorCarga = true;
        this.cargando = false;
      }
    });
  }

  cargarBanners(): void {
    this.cargandoBanners = true;
    this.errorBanners = false;
    this.homeService.listarBannersPublicos().subscribe({
      next: banners => {
        this.banners = [...(banners ?? [])].sort((a, b) => a.orden - b.orden);
        this.bannerActual = 0;
        this.cargandoBanners = false;
        this.iniciarCarrusel();
      },
      error: error => {
        console.error('Error cargando banners:', error);
        this.banners = [];
        this.errorBanners = true;
        this.cargandoBanners = false;
      }
    });
  }

  cargarColecciones(): void {
    this.cargandoColecciones = true;
    this.errorColecciones = false;
    this.homeService.listarColeccionesPublicas().subscribe({
      next: colecciones => {
        this.colecciones = [...(colecciones ?? [])].sort((a, b) => a.orden - b.orden);
        this.cargandoColecciones = false;
      },
      error: error => {
        console.error('Error cargando colecciones:', error);
        this.colecciones = [];
        this.errorColecciones = true;
        this.cargandoColecciones = false;
      }
    });
  }

  get productosPortada(): Producto[] {
    const ordenados = [...this.productos].sort((a, b) => Number(b.destacado) - Number(a.destacado) || Number(b.nuevo) - Number(a.nuevo));
    // Mezcla mujeres y hombres cuando ambos grupos tienen artículos.
    const mujeres = ordenados.filter(p => this.esGenero(p, 'mujer'));
    const hombres = ordenados.filter(p => this.esGenero(p, 'hombre'));
    const mezclados: Producto[] = [];
    for (let i = 0; i < 4; i++) {
      if (mujeres[i]) mezclados.push(mujeres[i]);
      if (hombres[i]) mezclados.push(hombres[i]);
    }
    const seleccion = mezclados.length ? mezclados : ordenados;
    const ids = new Set(seleccion.map(p => p.idProducto));
    return [...seleccion, ...ordenados.filter(p => !ids.has(p.idProducto))].slice(0, 8);
  }

  private esGenero(producto: Producto, genero: string): boolean {
    return (producto.genero?.nombreGenero ?? '').trim().toLocaleLowerCase('es').includes(genero);
  }

  get coleccionMujer(): HomeColeccion | null {
    return this.colecciones.find(c => (c.titulo ?? '').toLocaleLowerCase('es').includes('mujer') && !!c.imagen) ?? null;
  }
  get coleccionHombre(): HomeColeccion | null {
    return this.colecciones.find(c => (c.titulo ?? '').toLocaleLowerCase('es').includes('hombre') && !!c.imagen) ?? null;
  }

  imagenUrl(imagen: string | null | undefined): string | null {
    if (!imagen?.trim()) return null;
    if (/^https?:\/\//i.test(imagen)) return imagen;
    const ruta = imagen.replace(/^\/+/, '').replace(/^uploads\//, '').replace(/^productos\//, '');
    return this.uploadsUrl + ruta;
  }
  imagenBannerUrl(banner: HomeBanner): string | null { return this.imagenUrl(banner.imagen); }
  imagenColeccionUrl(coleccion: HomeColeccion): string | null { return this.imagenUrl(coleccion.imagen); }

  obtenerBannerActual(): HomeBanner | null { return this.banners[this.bannerActual] ?? null; }
  siguienteBanner(): void { this.moverBanner(1); }
  bannerAnterior(): void { this.moverBanner(-1); }
  private moverBanner(direccion: number): void {
    if (this.banners.length < 2) return;
    this.bannerActual = (this.bannerActual + direccion + this.banners.length) % this.banners.length;
    this.iniciarCarrusel();
  }
  irABanner(indice: number): void {
    if (indice < 0 || indice >= this.banners.length) return;
    this.bannerActual = indice;
    this.iniciarCarrusel();
  }
  private iniciarCarrusel(): void {
  this.detenerCarrusel();

  if (this.banners.length > 1) {
    this.intervaloCarrusel = setInterval(() => {
      this.bannerActual = (this.bannerActual + 1) % this.banners.length;
    }, 3000);
  }
}
  private detenerCarrusel(): void {
    if (this.intervaloCarrusel) clearInterval(this.intervaloCarrusel);
    this.intervaloCarrusel = null;
  }

  enlaceBanner(banner: HomeBanner): string { return this.enlaceSeguro(banner.enlaceBoton); }
  enlaceColeccion(coleccion: HomeColeccion): string { return this.enlaceSeguro(coleccion.enlace); }
  private enlaceSeguro(ruta?: string | null): string {
    if (!ruta || !ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('\\')) return '/tienda';
    return ruta;
  }
}
