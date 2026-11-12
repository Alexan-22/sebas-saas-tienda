import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
    this.cargando = true;
    this.error = '';

    this.ventaService.listarTodas().subscribe({
      next: respuesta => {
        this.pedidos = [...(respuesta ?? [])].sort(
          (a, b) =>
            new Date(b.fechaVenta).getTime() -
            new Date(a.fechaVenta).getTime()
        );

        this.aplicarFiltros();
        this.cargando = false;
      },
      error: error => {
        console.error('Error consultando pedidos:', error);
        this.error = 'No se pudieron cargar los pedidos.';
        this.cargando = false;
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
    this.pedidoSeleccionado = pedido;
    this.detalle = null;
    this.errorDetalle = '';
    this.cargandoDetalle = true;

    this.ventaService.detalleVentaAdmin(pedido.idVenta).subscribe({
      next: respuesta => {
        this.detalle = respuesta;
        this.cargandoDetalle = false;
      },
      error: error => {
        console.error('Error cargando detalle del pedido:', error);
        this.errorDetalle = 'No se pudo consultar el detalle.';
        this.cargandoDetalle = false;
      }
    });
  }

  cerrarDetalle(): void {
    this.pedidoSeleccionado = null;
    this.detalle = null;
    this.errorDetalle = '';
    this.cargandoDetalle = false;
  }
}
