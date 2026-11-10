import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Producto } from '../../core/models/producto';
import { ProductoTalla } from '../../core/models/producto-talla';
import { ProductoImagen } from '../../core/models/producto-imagen';
import { ProductoService } from '../../core/services/producto';
import { ProductoTallaService } from '../../core/services/producto-talla';
import { ProductoImagenService } from '../../core/services/producto-imagen';
import { CarritoService } from '../../core/services/carrito';
import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [DecimalPipe, RouterLink, PromoBar, Navbar, Footer],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetail implements OnInit {
  producto: Producto | null = null;
  tallas: ProductoTalla[] = [];
  tallaSeleccionada: ProductoTalla | null = null;

  // ==========================================
  // GALERÍA
  // ==========================================

  imagenes: ProductoImagen[] = [];
  imagenSeleccionada: string | null = null;
  cargandoImagenes = true;
  imagenAmpliada = false;

  // ==========================================
  // ESTADO
  // ==========================================

  cantidad = 1;
  cargando = true;
  cargandoTallas = true;
  errorCarga = false;
  productoAgregado = false;

  private readonly uploadsUrl = `${environment.apiUrl}/uploads/`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productoService: ProductoService,
    private productoTallaService: ProductoTallaService,
    private productoImagenService: ProductoImagenService,
    private carritoService: CarritoService,
    private cdr: ChangeDetectorRef
  ) {}

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    console.log(
      '=============================='
    );

    console.log(
      'PRODUCT DETAIL INICIADO'
    );

    console.log(
      'ID RECIBIDO:',
      id
    );

    console.log(
      '=============================='
    );

    if (!id || Number.isNaN(id)) {
      console.error(
        'ID DE PRODUCTO NO VÁLIDO:',
        idParam
      );

      this.errorCarga = true;
      this.cargando = false;
      this.cargandoTallas = false;
      this.cargandoImagenes = false;

      this.cdr.detectChanges();
      return;
    }

    this.cargarProducto(id);
    this.cargarTallas(id);
    this.cargarImagenes(id);
  }

  // ==========================================
  // PRODUCTO
  // ==========================================

  cargarProducto(id: number): void {
    console.log(
      'Solicitando producto:',
      id
    );

    this.productoService
      .buscarPorId(id)
      .subscribe({
        next: (producto: Producto) => {
          console.log(
            'PRODUCTO CARGADO:',
            producto
          );

          console.log(
            'CARGANDO ANTES:',
            this.cargando
          );

          this.producto = producto;

          if (producto.imagen && !this.imagenSeleccionada) {
            this.imagenSeleccionada = producto.imagen;
          }

          this.errorCarga = false;
          this.cargando = false;

          console.log(
            'CARGANDO DESPUÉS:',
            this.cargando
          );

          console.log(
            'PRODUCTO EN COMPONENTE:',
            this.producto
          );

          /*
           * Forzamos una actualización de la vista.
           *
           * Esto también nos permite comprobar si
           * el problema del skeleton corresponde
           * a detección de cambios.
           */
          this.cdr.detectChanges();
        },

        error: (error: unknown) => {
          console.error(
            'ERROR CARGANDO PRODUCTO:',
            error
          );

          this.producto = null;
          this.errorCarga = true;
          this.cargando = false;

          this.cdr.detectChanges();
        }
      });
  }

  // ==========================================
  // TALLAS
  // ==========================================

  cargarTallas(idProducto: number): void {
    this.cargandoTallas = true;

    this.productoTallaService
      .listarPorProducto(idProducto)
      .subscribe({
        next: (tallas: ProductoTalla[]) => {
          console.log(
            'TALLAS CARGADAS:',
            tallas
          );

          this.tallas = (tallas ?? [])
            .sort(
              (a, b) =>
                a.talla.idTalla -
                b.talla.idTalla
            );

          this.cargandoTallas = false;

          this.cdr.detectChanges();
        },

        error: (error: unknown) => {
          console.error(
            'ERROR CARGANDO TALLAS:',
            error
          );

          this.tallas = [];
          this.cargandoTallas = false;

          this.cdr.detectChanges();
        }
      });
  }

  // ==========================================
  // IMÁGENES ADICIONALES
  // ==========================================

  cargarImagenes(idProducto: number): void {
    this.cargandoImagenes = true;

    this.productoImagenService
      .listarPorProducto(idProducto)
      .subscribe({
        next: (imagenes: ProductoImagen[]) => {
          console.log(
            'IMÁGENES ADICIONALES:',
            imagenes
          );

          this.imagenes = (imagenes ?? [])
            .sort(
              (a, b) =>
                a.orden -
                b.orden
            );

          if (!this.imagenSeleccionada && this.imagenes.length > 0) {
            this.imagenSeleccionada = this.imagenes[0].imagen;
          }

          this.cargandoImagenes = false;

          this.cdr.detectChanges();
        },

        error: (error: unknown) => {
          console.error(
            'ERROR CARGANDO GALERÍA:',
            error
          );

          this.imagenes = [];
          this.cargandoImagenes = false;

          /*
           * Un fallo de galería no bloquea
           * el detalle del producto.
           */
          this.cdr.detectChanges();
        }
      });
  }

  // ==========================================
  // SELECCIONAR IMAGEN
  // ==========================================

  get galeriaUnificada(): string[] {
    const imagenes = [this.producto?.imagen, ...this.imagenes.map(i => i.imagen)].filter((s): s is string => !!s);
    return [...new Set(imagenes)];
  }

  get indiceImagenActual(): number {
    return Math.max(0, this.galeriaUnificada.indexOf(this.imagenSeleccionada ?? ''));
  }

  moverImagen(direccion: number): void {
    const fotos = this.galeriaUnificada;
    if (!fotos.length) return;
    this.imagenSeleccionada = fotos[(this.indiceImagenActual + direccion + fotos.length) % fotos.length];
  }

  ampliarImagen(): void { if (this.imagenUrl) this.imagenAmpliada = true; }
  cerrarAmpliacion(): void { this.imagenAmpliada = false; }

  seleccionarImagen(imagen: string): void {
    this.imagenSeleccionada = imagen;
  }

  // ==========================================
  // URL DE IMAGEN
  // ==========================================

  obtenerImagenUrl(imagen: string | null): string | null {
    if (!imagen) {
      return null;
    }

    if (/^https?:\/\//i.test(imagen)) return imagen;
    return this.uploadsUrl + imagen.replace(/^\/?uploads\//, '').replace(/^\/+/, '');
  }

  // ==========================================
  // SELECCIONAR TALLA
  // ==========================================

  seleccionarTalla(productoTalla: ProductoTalla): void {
    if (productoTalla.stock <= 0) {
      return;
    }

    this.tallaSeleccionada = productoTalla;
    this.cantidad = 1;
  }

  // ==========================================
  // AUMENTAR CANTIDAD
  // ==========================================

  aumentarCantidad(): void {
    if (!this.tallaSeleccionada) {
      return;
    }

    if (this.cantidad < this.tallaSeleccionada.stock) {
      this.cantidad++;
    }
  }

  // ==========================================
  // DISMINUIR CANTIDAD
  // ==========================================

  disminuirCantidad(): void {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  // ==========================================
  // AGREGAR AL CARRITO
  // ==========================================

  agregarAlCarrito(): void {
    if (!this.producto || !this.tallaSeleccionada) {
      return;
    }

    this.carritoService.agregar({
      idProducto: this.producto.idProducto,
      idProductoTalla: this.tallaSeleccionada.idProductoTalla,
      nombre: this.producto.nombre,
      talla: this.tallaSeleccionada.talla.nombreTalla,
      imagen: this.producto.imagen,
      precio: this.precioActual,
      cantidad: this.cantidad,
      stock: this.tallaSeleccionada.stock
    });

    this.productoAgregado = true;

    setTimeout(
      () => {
        this.productoAgregado = false;
        this.cdr.detectChanges();
      },
      2000
    );
  }

  // ==========================================
  // COMPRAR AHORA
  // ==========================================

  comprarAhora(): void {
    if (!this.producto || !this.tallaSeleccionada) {
      return;
    }

    this.agregarAlCarrito();

    this.router.navigate([
      '/carrito'
    ]);
  }

  // ==========================================
  // IMAGEN PRINCIPAL
  // ==========================================

  get imagenUrl(): string | null {
    return this.obtenerImagenUrl(this.imagenSeleccionada);
  }

  // ==========================================
  // OFERTA
  // ==========================================

  get tieneOferta(): boolean {
    return (
      this.producto?.precioOferta != null &&
      this.producto.precioOferta > 0 &&
      this.producto.precioOferta < this.producto.precio
    );
  }

  // ==========================================
  // PRECIO ACTUAL
  // ==========================================

  get precioActual(): number {
    if (!this.producto) {
      return 0;
    }

    if (
      this.tieneOferta &&
      this.producto.precioOferta != null
    ) {
      return this.producto.precioOferta;
    }

    return this.producto.precio;
  }

  // ==========================================
  // PORCENTAJE DE DESCUENTO
  // ==========================================

  get porcentajeDescuento(): number {
    if (
      !this.producto ||
      !this.tieneOferta ||
      this.producto.precioOferta == null
    ) {
      return 0;
    }

    return Math.round(
      (
        (this.producto.precio - this.producto.precioOferta) /
        this.producto.precio
      ) * 100
    );
  }

  // ==========================================
  // STOCK TOTAL
  // ==========================================

  get stockTotal(): number {
    return this.tallas.reduce(
      (total, productoTalla) =>
        total + Number(productoTalla.stock ?? 0),
      0
    );
  }

  // ==========================================
  // HAY STOCK
  // ==========================================

  get hayStock(): boolean {
    return this.stockTotal > 0;
  }

  // ==========================================
  // SUBTOTAL
  // ==========================================

  get subtotal(): number {
    return this.precioActual * this.cantidad;
  }

  // ==========================================
  // IMAGEN SELECCIONADA
  // ==========================================

  esImagenSeleccionada(imagen: string): boolean {
    return this.imagenSeleccionada === imagen;
  }
}
