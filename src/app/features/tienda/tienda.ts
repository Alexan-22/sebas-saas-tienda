import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, from, map, mergeMap, of, takeUntil, toArray } from 'rxjs';
import { CategoriaService } from '../../core/services/categoria';
import { ProductoService } from '../../core/services/producto';
import { ProductoTallaService } from '../../core/services/producto-talla';
import { Categoria, Genero, Producto } from '../../core/models/producto';
import { ProductoTalla } from '../../core/models/producto-talla';
import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { ProductCard } from '../../shared/components/product-card/product-card';

type TallaPublica = { id: number; nombre: string };

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [FormsModule, PromoBar, Navbar, Footer, ProductCard],
  templateUrl: './tienda.html',
  styleUrl: './tienda.css'
})
export class Tienda implements OnInit, OnDestroy {
  private readonly productosApi = inject(ProductoService);
  private readonly categoriasApi = inject(CategoriaService);
  private readonly tallasApi = inject(ProductoTallaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  categorias: Categoria[] = [];
  generos: Genero[] = [];
  tallas: TallaPublica[] = [];
  inventario: Record<number, ProductoTalla[]> = {};

  cargando = true;
  errorCarga = false;
  errorCategorias = false;
  inventarioParcial = false;
  busqueda = '';
  generoSeleccionado = 0;
  generoNombreSeleccionado = '';
  categoriaSeleccionada = 0;
  tallaSeleccionada = 0;
  soloNuevos = false;
  soloOfertas = false;
  soloDisponibles = false;
  precioMinimo: number | null = null;
  precioMaximo: number | null = null;
  ordenSeleccionado = 'relevancia';

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.busqueda = params.get('q') ?? '';
      this.generoSeleccionado = Number(params.get('genero')) || 0;
      this.generoNombreSeleccionado = params.get('generoNombre') ?? '';
      this.categoriaSeleccionada = Number(params.get('categoria')) || 0;
      this.soloNuevos = params.get('nuevo') === 'true';
      this.soloOfertas = params.get('ofertas') === 'true';
      this.aplicarFiltros();
    });
    this.cargarCategorias();
    this.cargarProductos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarCategorias(): void {
    this.categoriasApi.listar().pipe(takeUntil(this.destroy$)).subscribe({
      next: categorias => {
        this.categorias = (Array.isArray(categorias) ? categorias : [])
          .filter(c => c?.estado !== false)
          .sort((a, b) => a.nombreCategoria.localeCompare(b.nombreCategoria, 'es'));
        this.errorCategorias = false;
      },
      error: err => { console.error('Error cargando categorías:', err); this.errorCategorias = true; }
    });
  }

  cargarProductos(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.inventarioParcial = false;
    this.productosApi.listar().pipe(takeUntil(this.destroy$)).subscribe({
      next: productos => {
        this.productos = (Array.isArray(productos) ? productos : []).filter(p => p?.estado !== false);
        const generos = new Map<number, Genero>();
        for (const producto of this.productos) {
          if (producto.genero?.idGenero != null) generos.set(producto.genero.idGenero, producto.genero);
        }
        this.generos = [...generos.values()].sort((a, b) => a.nombreGenero.localeCompare(b.nombreGenero, 'es'));
        this.aplicarFiltros();
        this.cargarInventario();
      },
      error: err => {
        console.error('Error cargando catálogo:', err);
        this.productos = [];
        this.generos = [];
        this.inventario = {};
        this.tallas = [];
        this.errorCarga = true;
        this.cargando = false;
        this.aplicarFiltros();
      }
    });
  }

  private cargarInventario(): void {
    if (!this.productos.length) {
      this.inventario = {};
      this.tallas = [];
      this.cargando = false;
      return;
    }
    // Limitar a seis consultas simultáneas para no saturar Spring Boot.
    from(this.productos).pipe(
      mergeMap(producto =>
        this.tallasApi.listarPorProducto(producto.idProducto).pipe(
          map(items => ({ id: producto.idProducto, items: Array.isArray(items) ? items : [], error: false })),
          catchError(err => {
            console.warn('No se pudo consultar inventario del producto', producto.idProducto, err);
            return of({ id: producto.idProducto, items: [] as ProductoTalla[], error: true });
          })
        ), 6
      ),
      toArray(),
      takeUntil(this.destroy$)
    ).subscribe({
      next: resultados => {
        this.inventario = {};
        const tallasMap = new Map<number, TallaPublica>();
        this.inventarioParcial = resultados.some(r => r.error);
        for (const r of resultados) {
          this.inventario[r.id] = r.items;
          for (const item of r.items) {
            if (!item.talla || item.talla.idTalla == null) continue;
            // El nombre exacto proviene del backend; admite ambos nombres comunes.
            const t = item.talla as typeof item.talla & { nombreTalla?: string; nombre?: string };
            const nombre = t.nombreTalla ?? t.nombre ?? `Talla ${t.idTalla}`;
            tallasMap.set(t.idTalla, { id: t.idTalla, nombre });
          }
        }
        this.tallas = [...tallasMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
        this.cargando = false;
        this.aplicarFiltros();
      },
      error: err => {
        console.error('Error obteniendo inventario:', err);
        this.inventarioParcial = true;
        this.cargando = false;
        this.aplicarFiltros();
      }
    });
  }

  aplicarFiltros(): void {
    const texto = this.busqueda.trim().toLocaleLowerCase('es');
    const generoNombre = this.generoNombreSeleccionado.trim().toLocaleLowerCase('es');
    let resultado = this.productos.filter(p => {
      if (texto) {
        const contenido = [p.nombre, p.descripcion, p.genero?.nombreGenero, p.categoria?.nombreCategoria]
          .filter(Boolean).join(' ').toLocaleLowerCase('es');
        if (!contenido.includes(texto)) return false;
      }
      if (generoNombre && p.genero?.nombreGenero?.toLocaleLowerCase('es') !== generoNombre) return false;
      if (!generoNombre && this.generoSeleccionado && p.genero?.idGenero !== this.generoSeleccionado) return false;
      if (this.categoriaSeleccionada && p.categoria?.idCategoria !== this.categoriaSeleccionada) return false;
      if (this.soloNuevos && !p.nuevo) return false;
      if (this.soloOfertas && !this.tieneOferta(p)) return false;
      if (this.soloDisponibles && !this.stockTotal(p)) return false;
      if (this.tallaSeleccionada && !this.tieneTallaDisponible(p, this.tallaSeleccionada)) return false;
      if (this.precioMinimo != null && this.precioMinimo >= 0 && this.precioFinal(p) < this.precioMinimo) return false;
      if (this.precioMaximo != null && this.precioMaximo >= 0 && this.precioFinal(p) > this.precioMaximo) return false;
      return true;
    });
    switch (this.ordenSeleccionado) {
      case 'precio-asc': resultado = resultado.sort((a, b) => this.precioFinal(a) - this.precioFinal(b)); break;
      case 'precio-desc': resultado = resultado.sort((a, b) => this.precioFinal(b) - this.precioFinal(a)); break;
      case 'nombre': resultado = resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')); break;
    }
    this.productosFiltrados = resultado;
  }

  precioFinal(p: Producto): number {
    return this.tieneOferta(p) ? Number(p.precioOferta) : Number(p.precio);
  }
  tieneOferta(p: Producto): boolean {
    return p.precioOferta != null && Number(p.precioOferta) > 0 && Number(p.precioOferta) < Number(p.precio);
  }
  stockTotal(p: Producto): number {
    return (this.inventario[p.idProducto] ?? []).reduce((s, item) => s + Math.max(0, Number(item.stock ?? 0)), 0);
  }
  tieneTallaDisponible(p: Producto, id: number): boolean {
    return (this.inventario[p.idProducto] ?? []).some(item => item.talla?.idTalla === id && Number(item.stock) > 0);
  }
  seleccionarGenero(id: number): void {
    this.generoNombreSeleccionado = '';
    this.generoSeleccionado = id;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { genero: id || null, generoNombre: null }, queryParamsHandling: 'merge' });
    this.aplicarFiltros();
  }
  seleccionarCategoria(id: number): void { this.categoriaSeleccionada = id; this.aplicarFiltros(); }
  seleccionarTalla(id: number): void { this.tallaSeleccionada = this.tallaSeleccionada === id ? 0 : id; this.aplicarFiltros(); }
  limpiarFiltros(): void {
    this.busqueda = '';
    this.generoSeleccionado = 0;
    this.generoNombreSeleccionado = '';
    this.categoriaSeleccionada = 0;
    this.tallaSeleccionada = 0;
    this.soloNuevos = false;
    this.soloOfertas = false;
    this.soloDisponibles = false;
    this.precioMinimo = null;
    this.precioMaximo = null;
    this.ordenSeleccionado = 'relevancia';
    void this.router.navigate([], { relativeTo: this.route, queryParams: { q: null, genero: null, generoNombre: null, categoria: null, nuevo: null, ofertas: null }, queryParamsHandling: 'merge' });
    this.aplicarFiltros();
  }
  get tituloCatalogo(): string {
    if (this.generoNombreSeleccionado) return `Moda ${this.generoNombreSeleccionado}`;
    if (this.generoSeleccionado) return this.generos.find(g => g.idGenero === this.generoSeleccionado)?.nombreGenero ?? 'Colección';
    if (this.soloOfertas) return 'Ofertas especiales';
    if (this.soloNuevos) return 'Novedades';
    return 'Explora nuestra tienda';
  }
}
