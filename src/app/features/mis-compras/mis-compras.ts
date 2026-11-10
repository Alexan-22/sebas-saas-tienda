import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VentaService } from '../../core/services/venta';
import { Venta } from '../../core/models/venta-detalle';
import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, PromoBar, Navbar, Footer],
  templateUrl: './mis-compras.html',
  styleUrl: './mis-compras.css'
})
export class MisCompras implements OnInit {
  ventas: Venta[] = [];
  cargando = true;
  error = false;

  constructor(
    private ventaService: VentaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCompras();
  }

  cargarCompras(): void {
    this.cargando = true;
    this.error = false;

    this.ventaService
      .misCompras()
      .subscribe({
        next: (ventas) => {
          this.ventas = [...ventas]
            .sort(
              (a, b) =>
                new Date(b.fechaVenta).getTime() -
                new Date(a.fechaVenta).getTime()
            );

          this.cargando = false;
          this.error = false;

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error(
            'Error cargando compras:',
            error
          );

          this.ventas = [];
          this.error = true;
          this.cargando = false;

          this.cdr.detectChanges();
        }
      });
  }

  get cantidadCompras(): number {
    return this.ventas.length;
  }

  get totalGastado(): number {
    return this.ventas.reduce(
      (total, venta) => total + Number(venta.total || 0),
      0
    );
  }

  get ultimaCompra(): Venta | null {
    if (this.ventas.length === 0) {
      return null;
    }

    return this.ventas[0];
  }

  claseEstado(estado: string): string {
    const valor = estado?.toUpperCase() || '';

    switch (valor) {
      case 'REGISTRADA':
        return 'estado-registrada';

      case 'PAGADA':
        return 'estado-pagada';

      case 'ENVIADA':
        return 'estado-enviada';

      case 'ENTREGADA':
        return 'estado-entregada';

      case 'CANCELADA':
        return 'estado-cancelada';

      default:
        return 'estado-default';
    }
  }

  textoPago(medioPago: string): string {
    const pago = medioPago?.toUpperCase() || '';

    if (pago === 'YAPE') {
      return 'Yape';
    }

    if (pago === 'TARJETA') {
      return 'Tarjeta';
    }

    return medioPago;
  }
}