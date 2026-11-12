import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VentaService } from '../../core/services/venta';
import { DetalleCompraResponse, DetalleVenta } from '../../core/models/venta-detalle';
import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-detalle-compra',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, PromoBar, Navbar, Footer],
  templateUrl: './detalle-compra.html',
  styleUrl: './detalle-compra.css'
})
export class DetalleCompra implements OnInit {
  idVenta = 0;
  compra: DetalleCompraResponse | null = null;
  detalles: DetalleVenta[] = [];
  cargando = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private ventaService: VentaService,
    private cdr: ChangeDetectorRef
  ) {}

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    this.idVenta = Number(idParam);

    if (!this.idVenta || Number.isNaN(this.idVenta)) {
      this.error = true;
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    this.cargarDetalle();
  }

  // ==========================================
  // CARGAR DETALLE
  // ==========================================

  cargarDetalle(): void {
    this.cargando = true;
    this.error = false;

    this.ventaService
      .detalleVenta(this.idVenta)
      .subscribe({
        next: (compra: DetalleCompraResponse) => {
          console.log(
            'DETALLE COMPLETO DE COMPRA:',
            compra
          );

          this.compra = compra;
          this.detalles = compra?.detalles ?? [];
          this.cargando = false;
          this.error = false;

          this.cdr.detectChanges();
        },

        error: (error: unknown) => {
          console.error(
            'ERROR CARGANDO DETALLE:',
            error
          );

          this.compra = null;
          this.detalles = [];
          this.error = true;
          this.cargando = false;

          this.cdr.detectChanges();
        }
      });
  }

  // ==========================================
  // SUBTOTAL DE PRODUCTOS
  // ==========================================

  get subtotal(): number {
    if (
      this.compra?.subtotal !== null &&
      this.compra?.subtotal !== undefined
    ) {
      return Number(this.compra.subtotal);
    }

    return this.detalles.reduce(
      (total, detalle) => {
        return total + Number(detalle.subtotal ?? 0);
      },
      0
    );
  }

  // ==========================================
  // COSTO DELIVERY
  // ==========================================

  get costoDelivery(): number {
    return Number(this.compra?.costoDelivery ?? 0);
  }

  // ==========================================
  // TOTAL OFICIAL
  // ==========================================

  get total(): number {
    return Number(this.compra?.total ?? 0);
  }

  // ==========================================
  // TOTAL DE PRODUCTOS
  // ==========================================

  get totalProductos(): number {
    return this.detalles.reduce(
      (total, detalle) => {
        return total + Number(detalle.cantidad ?? 0);
      },
      0
    );
  }

  // ==========================================
  // NOMBRE COMPLETO
  // ==========================================

  get nombreCompletoCliente(): string {
    if (!this.compra) {
      return '';
    }

    return [
      this.compra.nombreCliente,
      this.compra.apellidoCliente
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ==========================================
  // DIRECCIÓN DE ENVÍO
  // ==========================================

  get tieneDireccionEnvio(): boolean {
    return !!this.compra?.direccionEnvio;
  }

  get ubicacionEnvio(): string {
    const direccion = this.compra?.direccionEnvio;

    if (!direccion) {
      return '';
    }

    return [
      direccion.distrito,
      direccion.provincia,
      direccion.departamento
    ]
      .filter(Boolean)
      .join(', ');
  }

  // ==========================================
  // MEDIO DE PAGO
  // ==========================================

  get medioPagoTexto(): string {
    const medio = this.compra?.medioPago?.toUpperCase();

    if (medio === 'YAPE') {
      return 'Yape';
    }

    if (medio === 'TARJETA') {
      return 'Tarjeta';
    }

    return this.compra?.medioPago || 'No especificado';
  }

  // ==========================================
  // ESTADO
  // ==========================================

  get estadoTexto(): string {
    return this.compra?.estado || 'REGISTRADA';
  }

  // ==========================================
  // IMPRIMIR
  // ==========================================

  imprimir(): void {
    window.print();
  }
}