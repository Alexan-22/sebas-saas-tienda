import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { VentaService } from '../../../core/services/venta';
import {
  Venta,
  DetalleCompraResponse
} from '../../../core/models/venta-detalle';
@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class Pedidos implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private versionPedidos = 0;
  private versionDetalle = 0;
  pedidos: Venta[] = [];
  pedidosFiltrados: Venta[] = [];

  busqueda = '';
  filtroEstado = '';

  cargando = true;
  error = '';

  pedidoSeleccionado: Venta | null = null;
  detalle: DetalleCompraResponse | null = null;
  cargandoDetalle = false;
  errorDetalle = '';

  constructor(private ventaService: VentaService) {}

  ngOnInit(): void {
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    const version = ++this.versionPedidos;

    this.cargando = true;
    this.error = '';
    this.cdr.markForCheck();

    this.ventaService.listarTodas()
      .pipe(
        timeout(30000),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: respuesta => {
          if (version !== this.versionPedidos) return;

          this.pedidos = [...(respuesta ?? [])].sort(
            (a, b) =>
              new Date(b.fechaVenta).getTime() -
              new Date(a.fechaVenta).getTime()
          );

          this.aplicarFiltros();
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: error => {
          if (version !== this.versionPedidos) return;

          console.error('Error consultando pedidos:', error);
          this.error = 'No se pudieron cargar los pedidos.';
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
  }

  aplicarFiltros(): void {
    const texto = this.busqueda.trim().toLowerCase();

    this.pedidosFiltrados = this.pedidos.filter(pedido => {
      const cliente = [
        pedido.nombreCliente,
        pedido.apellidoCliente,
        pedido.correoCliente
      ].filter(Boolean).join(' ').toLowerCase();

      const estado = String(
        pedido.estadoPedido || pedido.estado || ''
      ).toUpperCase();

      const coincideBusqueda =
        !texto ||
        String(pedido.idVenta).includes(texto) ||
        cliente.includes(texto);

      const coincideEstado =
        !this.filtroEstado || estado === this.filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }

  get estados(): string[] {
    return [...new Set(
      this.pedidos
        .map(p => String(p.estadoPedido || p.estado || '').toUpperCase())
        .filter(Boolean)
    )];
  }

  get totalPedidos(): number {
    return this.pedidos.length;
  }

  get pendientes(): number {
    return this.pedidos.filter(p => {
      const estado = String(p.estadoPedido || p.estado || '').toUpperCase();
      return [
        'PENDIENTE',
        'CONFIRMADO',
        'CONFIRMADA',
        'EN_PREPARACION',
        'PREPARANDO'
      ].includes(estado);
    }).length;
  }

  get enviados(): number {
    return this.pedidos.filter(p =>
      ['ENVIADO', 'EN_TRANSITO'].includes(
        String(p.estadoPedido || '').toUpperCase()
      )
    ).length;
  }

  get entregados(): number {
    return this.pedidos.filter(p =>
      ['ENTREGADO', 'ENTREGADA'].includes(
        String(p.estadoPedido || '').toUpperCase()
      )
    ).length;
  }

  abrirDetalle(pedido: Venta): void {
    const version = ++this.versionDetalle;

    this.pedidoSeleccionado = pedido;
    this.detalle = null;
    this.errorDetalle = '';
    this.cargandoDetalle = true;
    this.cdr.detectChanges();

    this.ventaService.detalleVentaAdmin(pedido.idVenta)
      .pipe(
        timeout(30000),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: respuesta => {
          if (version !== this.versionDetalle) return;

          this.detalle = respuesta;
          this.cargandoDetalle = false;
          this.cdr.detectChanges();
        },
        error: error => {
          if (version !== this.versionDetalle) return;

          console.error('Error cargando detalle del pedido:', error);
          this.errorDetalle = 'No se pudo consultar el detalle.';
          this.cargandoDetalle = false;
          this.cdr.detectChanges();
        }
      });
  }

  cerrarDetalle(): void {
    ++this.versionDetalle;

    this.pedidoSeleccionado = null;
    this.detalle = null;
    this.errorDetalle = '';
    this.cargandoDetalle = false;
    this.cdr.detectChanges();
  }
}
