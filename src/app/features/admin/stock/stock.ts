import { environment } from '../../../../environments/environment';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Producto } from '../../../core/models/producto';
import { ProductoTalla, Talla } from '../../../core/models/producto-talla';
import { ProductoService } from '../../../core/services/producto';
import { ProductoTallaService } from '../../../core/services/producto-talla';
import { TallaService } from '../../../core/services/talla';

interface ProductoInventario {
  producto: Producto;
  tallas: ProductoTalla[];
}

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './stock.html',
  styleUrl: './stock.css'
})
export class Stock implements OnInit {
  productos: Producto[] = [];
  tallasDisponibles: Talla[] = [];
  inventario: ProductoInventario[] = [];
  inventarioFiltrado: ProductoInventario[] = [];

  busqueda = '';
  cargando = true;
  error = '';
  guardandoId: number | null = null;

  // =========================================================
  // ASIGNAR NUEVA TALLA
  // =========================================================
  productoAsignandoId: number | null = null;
  nuevaTallaId: number | null = null;
  nuevoStock = 0;
  guardandoNuevaTalla = false;

  private readonly uploadsUrl = `${environment.apiUrl}/uploads/`;

  constructor(
    private productoService: ProductoService,
    private productoTallaService: ProductoTallaService,
    private tallaService: TallaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  // =========================================================
  // CARGAR PRODUCTOS + TALLAS GENERALES
  // =========================================================
  cargarDatos(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      productos: this.productoService.listar(),
      tallas: this.tallaService.listar()
    }).subscribe({
      next: respuesta => {
        this.productos = respuesta.productos ?? [];
        this.tallasDisponibles = (respuesta.tallas ?? [])
          .filter(talla => talla.estado !== false)
          .sort((a, b) => this.ordenTalla(a.nombreTalla) - this.ordenTalla(b.nombreTalla));

        this.cargarInventarioProductos();
      },
      error: error => {
        console.error('Error cargando productos o tallas:', error);
        this.error = 'No se pudieron cargar los productos y tallas.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================
  // CARGAR INVENTARIO
  // =========================================================
  cargarInventario(): void {
    this.cargarDatos();
  }

  private cargarInventarioProductos(): void {
    if (this.productos.length === 0) {
      this.inventario = [];
      this.inventarioFiltrado = [];
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    const consultas = this.productos.map(producto =>
      this.productoTallaService.listarPorProducto(producto.idProducto)
    );

    forkJoin(consultas).subscribe({
      next: resultados => {
        this.inventario = this.productos.map((producto, index) => ({
          producto,
          tallas: [...(resultados[index] ?? [])].sort(
            (a, b) => this.ordenTalla(a.talla.nombreTalla) - this.ordenTalla(b.talla.nombreTalla)
          )
        }));

        this.aplicarFiltro();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Error cargando tallas de productos:', error);
        this.error = 'No se pudo cargar el inventario.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================
  // BUSCADOR
  // =========================================================
  aplicarFiltro(): void {
    const texto = this.busqueda.trim().toLowerCase();

    if (!texto) {
      this.inventarioFiltrado = [...this.inventario];
      return;
    }

    this.inventarioFiltrado = this.inventario.filter(item => {
      const nombre = item.producto.nombre?.toLowerCase() ?? '';
      const categoria = item.producto.categoria?.nombreCategoria?.toLowerCase() ?? '';
      const genero = item.producto.genero?.nombreGenero?.toLowerCase() ?? '';

      return nombre.includes(texto) || categoria.includes(texto) || genero.includes(texto);
    });
  }

  // =========================================================
  // ABRIR FORMULARIO PARA ASIGNAR TALLA
  // =========================================================
  abrirAsignacion(item: ProductoInventario): void {
    if (this.productoAsignandoId === item.producto.idProducto) {
      this.cancelarAsignacion();
      return;
    }

    const disponibles = this.tallasNoAsignadas(item);

    if (disponibles.length === 0) {
      window.alert('Este producto ya tiene todas las tallas disponibles asignadas.');
      return;
    }

    this.productoAsignandoId = item.producto.idProducto;
    this.nuevaTallaId = disponibles[0].idTalla;
    this.nuevoStock = 0;
    this.cdr.detectChanges();
  }

  // =========================================================
  // CANCELAR ASIGNACIÓN
  // =========================================================
  cancelarAsignacion(): void {
    this.productoAsignandoId = null;
    this.nuevaTallaId = null;
    this.nuevoStock = 0;
    this.guardandoNuevaTalla = false;
    this.cdr.detectChanges();
  }

  // =========================================================
  // TALLAS DISPONIBLES SEGÚN PRODUCTO
  // =========================================================
  tallasNoAsignadas(item: ProductoInventario): Talla[] {
    const genero = item.producto.genero?.nombreGenero?.trim().toLowerCase() ?? '';
    const categoria = item.producto.categoria?.nombreCategoria?.trim().toLowerCase() ?? '';

    const tallasAdulto = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const tallasPantalon = ['28', '30', '32', '34', '36', '38'];
    const tallasNinos = ['2', '4', '6', '8', '10', '12', '14', '16'];

    let permitidas: string[];

    if (genero === 'niño' || genero === 'niña') {
      permitidas = tallasNinos;
    } else if (categoria === 'pantalones') {
      permitidas = tallasPantalon;
    } else {
      permitidas = tallasAdulto;
    }

    const idsAsignados = new Set(
      item.tallas.map(productoTalla => productoTalla.talla.idTalla)
    );

    return this.tallasDisponibles
      .filter(talla =>
        permitidas.includes(talla.nombreTalla) &&
        !idsAsignados.has(talla.idTalla)
      )
      .sort(
        (a, b) =>
          permitidas.indexOf(a.nombreTalla) -
          permitidas.indexOf(b.nombreTalla)
      );
  }

  // =========================================================
  // ASIGNAR NUEVA TALLA
  // =========================================================
  asignarTalla(item: ProductoInventario): void {
    if (this.nuevaTallaId === null) {
      window.alert('Selecciona una talla.');
      return;
    }

    const stock = Number(this.nuevoStock);

    if (Number.isNaN(stock) || stock < 0) {
      window.alert('Ingresa un stock válido.');
      return;
    }

    const stockFinal = Math.floor(stock);
    this.nuevoStock = stockFinal;
    this.guardandoNuevaTalla = true;
    this.cdr.detectChanges();

    this.productoTallaService.registrar(
      item.producto.idProducto,
      this.nuevaTallaId,
      stockFinal
    ).subscribe({
      next: productoTalla => {
        item.tallas.push(productoTalla);
        item.tallas.sort(
          (a, b) => this.ordenTalla(a.talla.nombreTalla) - this.ordenTalla(b.talla.nombreTalla)
        );

        this.guardandoNuevaTalla = false;
        this.productoAsignandoId = null;
        this.nuevaTallaId = null;
        this.nuevoStock = 0;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Error asignando talla:', error);
        this.guardandoNuevaTalla = false;
        this.cdr.detectChanges();
        window.alert('No se pudo asignar la talla al producto.');
      }
    });
  }

  // =========================================================
  // AUMENTAR / DISMINUIR STOCK LOCALMENTE
  // =========================================================
  aumentar(productoTalla: ProductoTalla): void {
    productoTalla.stock = Number(productoTalla.stock) + 1;
  }

  disminuir(productoTalla: ProductoTalla): void {
    const stockActual = Number(productoTalla.stock);
    if (stockActual > 0) productoTalla.stock = stockActual - 1;
  }

  // =========================================================
  // ACTUALIZAR STOCK
  // =========================================================
  actualizarStock(productoTalla: ProductoTalla): void {
    const stock = Number(productoTalla.stock);

    if (Number.isNaN(stock)) {
      window.alert('Ingresa una cantidad válida.');
      return;
    }

    if (stock < 0) {
      productoTalla.stock = 0;
      window.alert('El stock no puede ser negativo.');
      return;
    }

    const stockFinal = Math.floor(stock);
    productoTalla.stock = stockFinal;

    const idProductoTalla = productoTalla.idProductoTalla;
    this.guardandoId = idProductoTalla;
    this.cdr.detectChanges();

    this.productoTallaService.actualizarStock(idProductoTalla, stockFinal).subscribe({
      next: actualizado => {
        if (actualizado && actualizado.stock !== undefined) {
          productoTalla.stock = Number(actualizado.stock);
        }

        this.guardandoId = null;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Error actualizando stock:', error);
        this.guardandoId = null;
        this.cdr.detectChanges();
        window.alert('No se pudo actualizar el stock.');
      },
      complete: () => {
        this.guardandoId = null;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================
  // ORDEN VISUAL DE TALLAS
  // =========================================================
  private ordenTalla(talla: string): number {
    const orden = [
      'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
      '2', '4', '6', '8', '10', '12', '14', '16',
      '28', '30', '32', '34', '36', '38'
    ];

    const indice = orden.indexOf(talla);
    return indice === -1 ? 999 : indice;
  }

  // =========================================================
  // IMAGEN
  // =========================================================
  imagenUrl(producto: Producto): string | null {
    return producto.imagen ? this.uploadsUrl + producto.imagen : null;
  }

  // =========================================================
  // STOCK TOTAL DE UN PRODUCTO
  // =========================================================
  stockProducto(item: ProductoInventario): number {
    return item.tallas.reduce(
      (total, productoTalla) => total + Number(productoTalla.stock ?? 0),
      0
    );
  }

  // =========================================================
  // STOCK TOTAL
  // =========================================================
  get stockTotal(): number {
    return this.inventario.reduce(
      (total, item) => total + this.stockProducto(item),
      0
    );
  }

  // =========================================================
  // PRODUCTOS SIN STOCK
  // =========================================================
  get productosSinStock(): number {
    return this.inventario.filter(
      item => this.stockProducto(item) === 0
    ).length;
  }

  // =========================================================
  // STOCK BAJO
  // =========================================================
  get productosStockBajo(): number {
    return this.inventario.reduce((total, item) => {
      const tallasStockBajo = item.tallas.filter(productoTalla => {
        const stock = Number(productoTalla.stock ?? 0);
        return stock > 0 && stock <= 5;
      }).length;

      return total + tallasStockBajo;
    }, 0);
  }
}