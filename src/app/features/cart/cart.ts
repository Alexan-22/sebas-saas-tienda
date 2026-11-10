import { environment } from '../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CarritoService } from '../../core/services/carrito';
import { AuthService } from '../../core/services/auth';
import { ProductoTallaService } from '../../core/services/producto-talla';
import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [DecimalPipe, RouterLink, PromoBar, Navbar, Footer],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart implements OnInit {
  readonly items;
  readonly subtotal;

  sincronizandoStock = false;

  private readonly uploadsUrl = `${environment.apiUrl}/uploads/`;

  constructor(
    public carritoService: CarritoService,
    private authService: AuthService,
    private productoTallaService: ProductoTallaService,
    private router: Router
  ) {
    this.items = carritoService.items;
    this.subtotal = carritoService.subtotal;
  }

  ngOnInit(): void {
    this.sincronizarStock();
  }

  sincronizarStock(): void {
    const itemsActuales = this.carritoService.items();

    if (itemsActuales.length === 0) {
      return;
    }

    this.sincronizandoStock = true;

    const productosUnicos = [
      ...new Set(itemsActuales.map(item => item.idProducto))
    ];

    const consultas = productosUnicos.map(idProducto =>
      this.productoTallaService.listarPorProducto(idProducto).pipe(
        catchError(error => {
          console.error(
            'Error consultando stock del producto:',
            idProducto,
            error
          );

          return of([]);
        })
      )
    );

    forkJoin(consultas).subscribe({
      next: respuestas => {
        const tallas = respuestas.flat();

        for (const item of itemsActuales) {
          const productoTalla = tallas.find(
            talla => talla.idProductoTalla === item.idProductoTalla
          );

          if (!productoTalla) {
            continue;
          }

          this.carritoService.actualizarStock(
            item.idProductoTalla,
            productoTalla.stock
          );
        }

        this.sincronizandoStock = false;
      },
      error: error => {
        console.error('Error sincronizando stock:', error);
        this.sincronizandoStock = false;
      }
    });
  }

  aumentar(idProductoTalla: number, cantidad: number): void {
    this.carritoService.cambiarCantidad(idProductoTalla, cantidad + 1);
  }

  disminuir(idProductoTalla: number, cantidad: number): void {
    if (cantidad <= 1) {
      return;
    }

    this.carritoService.cambiarCantidad(idProductoTalla, cantidad - 1);
  }

  eliminar(idProductoTalla: number): void {
    this.carritoService.eliminar(idProductoTalla);
  }

  imagenUrl(imagen: string | null): string | null {
    if (!imagen) {
      return null;
    }

    return this.uploadsUrl + imagen;
  }

  continuarCompra(): void {
    const itemsActuales = this.carritoService.items();

    if (itemsActuales.length === 0) {
      return;
    }

    const existeAgotado = itemsActuales.some(item => item.stock <= 0);

    if (existeAgotado) {
      return;
    }

    if (!this.authService.autenticado()) {
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: '/checkout'
        }
      });

      return;
    }

    this.router.navigate(['/checkout']);
  }

  // COMPRA POR WHATSAPP SIN INICIAR SESIÓN
  comprarPorWhatsApp(): void {
    const productos = this.items();

    if (!productos.length || this.sincronizandoStock) {
      return;
    }

    if (productos.some(item => item.stock <= 0)) {
      alert('Retira los productos agotados antes de continuar.');
      return;
    }

    const detalle = productos.map(item =>
      `• ${item.nombre}\n` +
      `Talla: ${item.talla}\n` +
      `Cantidad: ${item.cantidad}\n` +
      `Precio unitario: S/ ${item.precio.toFixed(2)}\n` +
      `Subtotal: S/ ${(item.precio * item.cantidad).toFixed(2)}`
    ).join('\n\n');

    const mensaje =
      `Hola, Tienda Sebas. Quiero comprar:\n\n${detalle}\n\n` +
      `Subtotal de productos: S/ ${this.subtotal().toFixed(2)}\n` +
      `Envío pendiente de calcular.\n\n` +
      `¿Me confirman disponibilidad, precio final y formas de pago?`;

    window.open(
      `https://wa.me/51935421403?text=${encodeURIComponent(mensaje)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }
}








