import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TiendaService } from '../../../core/services/tienda.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { Venta, DetalleVenta } from '../../../core/models/venta-detalle';
import { Producto } from '../../../core/models/producto';
import { ProductoTalla } from '../../../core/models/producto-talla';
import { UsuarioAdmin } from '../../../core/models/usuario-admin';

import { VentaService } from '../../../core/services/venta';
import { ProductoService } from '../../../core/services/producto';
import { ProductoTallaService } from '../../../core/services/producto-talla';
import { UsuarioService } from '../../../core/services/usuario';

export type PestanaReporte = 'ventas' | 'inventario' | 'canales' | 'clientes';

interface ProductoVendido {
  idProducto: number;
  nombre: string;
  categoria: string;
  cantidad: number;
  ingresos: number;
  porcentaje: number;
}

interface MedioPagoReporte {
  nombre: string;
  cantidad: number;
  total: number;
  porcentaje: number;
}

interface CategoriaReporte {
  nombre: string;
  cantidad: number;
  ingresos: number;
  porcentaje: number;
}

interface CanalReporte {
  nombre: 'ONLINE';
  cantidad: number;
  total: number;
  porcentaje: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class Reportes implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly navegacion = inject(Router);
  private readonly tiendaService = inject(TiendaService);

  get nombreTienda(): string {
    return this.tiendaService.tiendaActual()?.nombre || 'Mi tienda';
  }

  // PESTAÑA ACTIVA
  pestanaActiva: PestanaReporte = 'ventas';

  // DATOS PRINCIPALES
  ventas: Venta[] = [];
  ventasFiltradas: Venta[] = [];
  productos: Producto[] = [];
  usuarios: UsuarioAdmin[] = [];
  detalles: DetalleVenta[] = [];
  inventario: ProductoTalla[] = [];
  stockIncompleto = false;

  // FILTROS
  periodo = 'TODO';

  // ESTADO
  cargando = true;
  error = '';

  // RESULTADOS
  productosVendidos: ProductoVendido[] = [];
  mediosPago: MedioPagoReporte[] = [];
  categorias: CategoriaReporte[] = [];
  canales: CanalReporte[] = [];

  constructor(
    private ventaService: VentaService,
    private productoService: ProductoService,
    private productoTallaService: ProductoTallaService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.ruta.queryParamMap.subscribe(params => {
      const vista = params.get('vista');
      if (vista === 'ventas' || vista === 'inventario' || vista === 'canales' || vista === 'clientes') {
        this.pestanaActiva = vista;
      }
    });
    this.cargarReportes();
  }

  seleccionarPestana(vista: PestanaReporte): void {
    this.pestanaActiva = vista;
    void this.navegacion.navigate([], {
      relativeTo: this.ruta,
      queryParams: { vista },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  cargarReportes(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      ventas: this.ventaService.listarTodas(),
      productos: this.productoService.listarAdmin(),
      usuarios: this.usuarioService.listarTodos()
    }).subscribe({
      next: respuesta => {
        this.ventas = respuesta.ventas ?? [];
        this.productos = respuesta.productos ?? [];
        this.usuarios = respuesta.usuarios ?? [];
        this.cargarInformacionSecundaria();
      },
      error: error => {
        console.error('Error cargando reportes:', error);
        this.error = 'No se pudo cargar la información de reportes.';
        this.cargando = false;
      }
    });
  }

  private cargarInformacionSecundaria(): void {
    // Dos consultas, ambas protegidas y filtradas por tenant en el backend.
    forkJoin({
      detalles: this.ventaService.listarDetallesParaReportes(),
      inventario: this.productoTallaService.listarInventarioParaReportes()
    }).subscribe({
      next: respuesta => {
        this.detalles = respuesta.detalles ?? [];
        this.inventario = respuesta.inventario ?? [];
        this.stockIncompleto = false;
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: error => {
        console.error('Error cargando detalle o inventario de reportes:', error);
        this.error = 'No se pudieron cargar los detalles de ventas o el inventario de esta tienda.';
        this.cargando = false;
      }
    });
  }

  aplicarPeriodo(): void { this.aplicarFiltros(); }

  private aplicarFiltros(): void {
    const ahora = new Date();

    this.ventasFiltradas = this.ventas.filter(venta => {
      const fecha = new Date(venta.fechaVenta);
      if (Number.isNaN(fecha.getTime())) return false;

      const cumplePeriodo = this.cumplePeriodo(fecha, ahora);
      return cumplePeriodo && this.esVentaContabilizable(venta);
    });

    this.generarProductosVendidos();
    this.generarMediosPago();
    this.generarCategorias();
    this.generarCanales();
  }

  private esVentaContabilizable(venta: Venta): boolean {
    const estado = String(venta.estado ?? '').toUpperCase();
    const pedido = String(venta.estadoPedido ?? '').toUpperCase();
    // No sumar pedidos anulados a los importes comerciales.
    return !['CANCELADO', 'CANCELADA', 'ANULADO', 'ANULADA'].includes(estado)
      && !['CANCELADO', 'CANCELADA', 'ANULADO', 'ANULADA'].includes(pedido);
  }

  private cumplePeriodo(fecha: Date, ahora: Date): boolean {
    if (this.periodo === 'TODO') return true;

    const inicioHoy = this.inicioDia(ahora);
    const finHoy = this.finDia(ahora);

    if (this.periodo === 'HOY') return fecha >= inicioHoy && fecha <= finHoy;

    if (this.periodo === 'AYER') {
      const inicioAyer = new Date(inicioHoy);
      inicioAyer.setDate(inicioAyer.getDate() - 1);
      const finAyer = new Date(inicioAyer);
      finAyer.setHours(23, 59, 59, 999);
      return fecha >= inicioAyer && fecha <= finAyer;
    }

    if (this.periodo === '7') {
      const limite = new Date(inicioHoy);
      limite.setDate(limite.getDate() - 6);
      return fecha >= limite && fecha <= finHoy;
    }

    if (this.periodo === '15') {
      const limite = new Date(inicioHoy);
      limite.setDate(limite.getDate() - 14);
      return fecha >= limite && fecha <= finHoy;
    }

    if (this.periodo === '30') {
      const limite = new Date(inicioHoy);
      limite.setDate(limite.getDate() - 29);
      return fecha >= limite && fecha <= finHoy;
    }

    if (this.periodo === 'MES') {
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
      return fecha >= inicioMes && fecha <= finHoy;
    }

    if (this.periodo === 'ANIO') {
      const inicioAnio = new Date(ahora.getFullYear(), 0, 1, 0, 0, 0, 0);
      return fecha >= inicioAnio && fecha <= finHoy;
    }

    if (this.periodo === 'ULTIMO_ANIO') {
      const limite = new Date(inicioHoy);
      limite.setFullYear(limite.getFullYear() - 1);
      return fecha >= limite && fecha <= finHoy;
    }

    return true;
  }

  private inicioDia(fecha: Date): Date {
    const resultado = new Date(fecha);
    resultado.setHours(0, 0, 0, 0);
    return resultado;
  }

  private finDia(fecha: Date): Date {
    const resultado = new Date(fecha);
    resultado.setHours(23, 59, 59, 999);
    return resultado;
  }

  private obtenerTipoVenta(_venta: Venta): 'ONLINE' { return 'ONLINE'; }

  private idsVentasFiltradas(): Set<number> {
    return new Set(this.ventasFiltradas.map(venta => venta.idVenta));
  }

  private detallesPeriodo(): DetalleVenta[] {
    const ids = this.idsVentasFiltradas();
    return this.detalles.filter(detalle => {
      const idVenta = this.obtenerIdVentaDetalle(detalle);
      if (idVenta === null) return false;
      return ids.has(idVenta);
    });
  }

  private obtenerIdVentaDetalle(detalle: DetalleVenta): number | null {
    return detalle.idVenta ?? null;
  }

  private generarProductosVendidos(): void {
    const mapa = new Map<number, ProductoVendido>();

    for (const detalle of this.detallesPeriodo()) {
      const producto = detalle.productoTalla?.producto;
      if (!producto) continue;

      const id = producto.idProducto;
      const actual = mapa.get(id);

      if (actual) {
        actual.cantidad += Number(detalle.cantidad ?? 0);
        actual.ingresos += Number(detalle.subtotal ?? 0);
      } else {
        mapa.set(id, {
          idProducto: id,
          nombre: producto.nombre,
          categoria: producto.categoria?.nombreCategoria ?? 'Sin categoría',
          cantidad: Number(detalle.cantidad ?? 0),
          ingresos: Number(detalle.subtotal ?? 0),
          porcentaje: 0
        });
      }
    }

    const resultado = Array.from(mapa.values()).sort((a, b) => b.cantidad - a.cantidad);
    const maximo = resultado.length > 0 ? resultado[0].cantidad : 0;

    resultado.forEach(producto => {
      producto.porcentaje = maximo > 0 ? (producto.cantidad / maximo) * 100 : 0;
    });

    this.productosVendidos = resultado;
  }

  private generarMediosPago(): void {
    const mapa = new Map<string, MedioPagoReporte>();

    for (const venta of this.ventasFiltradas) {
      const nombre = venta.medioPago || 'OTRO';
      const actual = mapa.get(nombre);

      if (actual) {
        actual.cantidad++;
        actual.total += Number(venta.total ?? 0);
      } else {
        mapa.set(nombre, { nombre, cantidad: 1, total: Number(venta.total ?? 0), porcentaje: 0 });
      }
    }

    const total = this.ventasFiltradas.length;
    this.mediosPago = Array.from(mapa.values())
      .map(item => ({ ...item, porcentaje: total > 0 ? (item.cantidad / total) * 100 : 0 }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  private generarCanales(): void {
    const mapa = new Map<'ONLINE', CanalReporte>();

    for (const venta of this.ventasFiltradas) {
      const nombre = this.obtenerTipoVenta(venta);
      const actual = mapa.get(nombre);

      if (actual) {
        actual.cantidad++;
        actual.total += Number(venta.total ?? 0);
      } else {
        mapa.set(nombre, { nombre, cantidad: 1, total: Number(venta.total ?? 0), porcentaje: 0 });
      }
    }

    const total = this.ventasFiltradas.length;
    this.canales = Array.from(mapa.values())
      .map(item => ({ ...item, porcentaje: total > 0 ? (item.cantidad / total) * 100 : 0 }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  private generarCategorias(): void {
    const mapa = new Map<string, CategoriaReporte>();

    for (const detalle of this.detallesPeriodo()) {
      const categoria = detalle.productoTalla?.producto?.categoria?.nombreCategoria ?? 'Sin categoría';
      const actual = mapa.get(categoria);

      if (actual) {
        actual.cantidad += Number(detalle.cantidad ?? 0);
        actual.ingresos += Number(detalle.subtotal ?? 0);
      } else {
        mapa.set(categoria, {
          nombre: categoria,
          cantidad: Number(detalle.cantidad ?? 0),
          ingresos: Number(detalle.subtotal ?? 0),
          porcentaje: 0
        });
      }
    }

    const resultado = Array.from(mapa.values()).sort((a, b) => b.cantidad - a.cantidad);
    const maximo = resultado.length > 0 ? resultado[0].cantidad : 0;

    resultado.forEach(categoria => {
      categoria.porcentaje = maximo > 0 ? (categoria.cantidad / maximo) * 100 : 0;
    });

    this.categorias = resultado;
  }

  get productosInactivos(): number {
    return this.productos.filter(p => !p.estado).length;
  }

  get inventarioCritico(): ProductoTalla[] {
    return [...this.inventario]
      .filter(item => Number(item.stock ?? 0) <= 5)
      .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
      .slice(0, 15);
  }

  get ventasRecientes(): Venta[] {
    return [...this.ventasFiltradas]
      .sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime())
      .slice(0, 12);
  }

  get mediosDestacados(): MedioPagoReporte[] {
    return this.mediosPago.slice(0, 4);
  }

  get clientesCompradores(): number {
    return this.rankingClientes.length;
  }

  get clientesRecurrentes(): number {
    return this.rankingClientes.filter(c => c.compras > 1).length;
  }

  get compradoresOnline(): number {
    return new Set(this.ventasFiltradas
      .filter(v => this.obtenerTipoVenta(v) === 'ONLINE' && v.idUsuario != null)
      .map(v => 'web-' + v.idUsuario)).size;
  }

  get rankingClientes(): Array<{ clave: string; nombre: string; tipo: string; compras: number; total: number }> {
    const mapa = new Map<string, { clave: string; nombre: string; tipo: string; compras: number; total: number }>();
    for (const venta of this.ventasFiltradas) {
      const tipo = 'ONLINE';
      const id = venta.idUsuario;
      if (id == null) continue;
      const clave = `${tipo}-${id}`;
      const nombre = `${venta.nombreCliente ?? ''} ${venta.apellidoCliente ?? ''}`.trim() || `Cliente ${id}`;
      const actual = mapa.get(clave);
      if (actual) {
        actual.compras++;
        actual.total += Number(venta.total ?? 0);
      } else {
        mapa.set(clave, { clave, nombre, tipo, compras: 1, total: Number(venta.total ?? 0) });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }

  get ventasPorDia(): Array<{ fecha: string; ventas: number; total: number; porcentaje: number }> {
    const mapa = new Map<string, { fecha: string; ventas: number; total: number; porcentaje: number }>();
    for (const venta of this.ventasFiltradas) {
      const fecha = String(venta.fechaVenta ?? '').slice(0, 10);
      if (!fecha) continue;
      const actual = mapa.get(fecha) ?? { fecha, ventas: 0, total: 0, porcentaje: 0 };
      actual.ventas++;
      actual.total += Number(venta.total ?? 0);
      mapa.set(fecha, actual);
    }
    const filas = Array.from(mapa.values()).sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(-15);
    const max = Math.max(0, ...filas.map(f => f.total));
    return filas.map(f => ({ ...f, porcentaje: max ? 100 * f.total / max : 0 }));
  }

  get ingresoOnline(): number {
    return this.ventasFiltradas.filter(v => this.obtenerTipoVenta(v) === 'ONLINE')
      .reduce((acc, v) => acc + Number(v.total ?? 0), 0);
  }

  get totalVentas(): number { return this.ventasFiltradas.length; }
  get ingresosTotales(): number { return this.ventasFiltradas.reduce((total, venta) => total + Number(venta.total ?? 0), 0); }
  get ventaPromedio(): number { return this.totalVentas > 0 ? this.ingresosTotales / this.totalVentas : 0; }
  get unidadesVendidas(): number { return this.detallesPeriodo().reduce((total, detalle) => total + Number(detalle.cantidad ?? 0), 0); }
  get ventasOnline(): number { return this.ventasFiltradas.filter(venta => this.obtenerTipoVenta(venta) === 'ONLINE').length; }

  get totalUsuarios(): number { return this.usuarios.length; }
  get usuariosActivos(): number { return this.usuarios.filter(usuario => usuario.estado).length; }
  get totalClientes(): number { return this.usuarios.filter(usuario => usuario.rol?.toUpperCase() === 'CLIENTE').length; }

  get stockTotal(): number { return this.inventario.reduce((total, item) => total + Number(item.stock ?? 0), 0); }
  get stockBajo(): number { return this.inventario.filter(item => item.stock > 0 && item.stock <= 5).length; }
  get sinStock(): number { return this.inventario.filter(item => item.stock <= 0).length; }
  get productosActivos(): number { return this.productos.filter(producto => producto.estado).length; }

  get productoMasVendido(): ProductoVendido | null { return this.productosVendidos.length > 0 ? this.productosVendidos[0] : null; }

  exportarPDF(): void {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const anchoPagina = pdf.internal.pageSize.getWidth();
    const fechaGeneracion = new Date().toLocaleString('es-PE');
    const periodo = this.obtenerNombrePeriodo();
    const canal = this.obtenerNombreCanal();

    pdf.setFillColor(124, 58, 237);
    pdf.rect(0, 0, anchoPagina, 34, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(this.nombreTienda.slice(0, 45), 14, 15);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('REPORTE DE VENTAS E INDICADORES', 14, 23);

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8);
    pdf.text(`Periodo: ${periodo}`, 14, 43);
    pdf.text(`Canal: ${canal}`, 14, 48);
    pdf.text(`Generado: ${fechaGeneracion}`, 14, 53);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('RESUMEN GENERAL', 14, 66);

    autoTable(pdf, {
      startY: 71,
      theme: 'grid',
      head: [['Pedidos web', 'Importe registrado', 'Unidades', 'Ticket promedio']],
      body: [[
        this.totalVentas.toString(),
        this.formatearMonedaPDF(this.ingresosTotales),
        this.unidadesVendidas.toString(),
        this.formatearMonedaPDF(this.ventaPromedio)
      ]],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    let posicionY = this.obtenerUltimaPosicionPDF(pdf) + 12;

    this.verificarEspacioPDF(pdf, posicionY, 35);
    if (posicionY > 245) { pdf.addPage(); posicionY = 20; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('MEDIOS DE PAGO', 14, posicionY);

    autoTable(pdf, {
      startY: posicionY + 5,
      theme: 'striped',
      head: [['Medio', 'Ventas', 'Total', 'Participacion']],
      body: this.mediosPago.length > 0
        ? this.mediosPago.map(medio => [medio.nombre, medio.cantidad.toString(), this.formatearMonedaPDF(medio.total), `${medio.porcentaje.toFixed(0)}%`])
        : [['Sin datos', '0', 'S/ 0.00', '0%']],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' } },
      margin: { left: 14, right: 14, bottom: 20 }
    });

    posicionY = this.obtenerUltimaPosicionPDF(pdf) + 12;

    if (posicionY > 245) { pdf.addPage(); posicionY = 20; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('VENTAS POR CANAL', 14, posicionY);

    autoTable(pdf, {
      startY: posicionY + 5,
      theme: 'striped',
      head: [['Canal', 'Ventas', 'Total', 'Participacion']],
      body: this.canales.length > 0
        ? this.canales.map(item => [item.nombre, item.cantidad.toString(), this.formatearMonedaPDF(item.total), `${item.porcentaje.toFixed(0)}%`])
        : [['Sin datos', '0', 'S/ 0.00', '0%']],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' } },
      margin: { left: 14, right: 14, bottom: 20 }
    });

    posicionY = this.obtenerUltimaPosicionPDF(pdf) + 12;

    if (posicionY > 240) { pdf.addPage(); posicionY = 20; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('VENTAS POR CATEGORIA', 14, posicionY);

    autoTable(pdf, {
      startY: posicionY + 5,
      theme: 'striped',
      head: [['Categoria', 'Unidades', 'Ingresos']],
      body: this.categorias.length > 0
        ? this.categorias.map(categoria => [categoria.nombre, categoria.cantidad.toString(), this.formatearMonedaPDF(categoria.ingresos)])
        : [['Sin datos', '0', 'S/ 0.00']],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14, bottom: 20 }
    });

    posicionY = this.obtenerUltimaPosicionPDF(pdf) + 12;

    if (posicionY > 235) { pdf.addPage(); posicionY = 20; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('PRODUCTOS VENDIDOS', 14, posicionY);

    autoTable(pdf, {
      startY: posicionY + 5,
      theme: 'striped',
      head: [['#', 'Producto', 'Categoria', 'Unidades', 'Ingresos']],
      body: this.productosVendidos.length > 0
        ? this.productosVendidos.map((producto, index) => [(index + 1).toString(), producto.nombre, producto.categoria, producto.cantidad.toString(), this.formatearMonedaPDF(producto.ingresos)])
        : [['-', 'Sin datos', '-', '0', 'S/ 0.00']],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 45 },
        3: { cellWidth: 24, halign: 'center' },
        4: { halign: 'right' }
      },
      margin: { left: 14, right: 14, bottom: 20 }
    });

    posicionY = this.obtenerUltimaPosicionPDF(pdf) + 12;
    if (posicionY > 235) { pdf.addPage(); posicionY = 20; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('ESTADO DEL INVENTARIO', 14, posicionY);

    autoTable(pdf, {
      startY: posicionY + 5,
      theme: 'grid',
      head: [['Stock total', 'Stock bajo', 'Sin stock', 'Productos activos']],
      body: [[this.stockTotal.toString(), this.stockBajo.toString(), this.sinStock.toString(), this.productosActivos.toString()]],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 14, right: 14, bottom: 20 }
    });

    posicionY = this.obtenerUltimaPosicionPDF(pdf) + 12;
    if (posicionY > 235) { pdf.addPage(); posicionY = 20; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('CUENTAS REGISTRADAS', 14, posicionY);

    autoTable(pdf, {
      startY: posicionY + 5,
      theme: 'grid',
      head: [['Clientes online', 'Usuarios totales', 'Cuentas activas']],
      body: [[this.totalClientes.toString(), this.totalUsuarios.toString(), this.usuariosActivos.toString()]],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 14, right: 14, bottom: 20 }
    });

    if (this.productoMasVendido) {
      posicionY = this.obtenerUltimaPosicionPDF(pdf) + 12;
      if (posicionY > 250) { pdf.addPage(); posicionY = 20; }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('PRODUCTO LÍDER DEL FILTRO', 14, posicionY);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`${this.productoMasVendido.nombre} - ${this.productoMasVendido.cantidad} unidades vendidas`, 14, posicionY + 7);
    }

    const totalPaginas = pdf.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      pdf.setPage(pagina);
      const altoPagina = pdf.internal.pageSize.getHeight();

      pdf.setDrawColor(220, 220, 220);
      pdf.line(14, altoPagina - 14, anchoPagina - 14, altoPagina - 14);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(130, 130, 130);

      pdf.text(`${this.nombreTienda} - Reporte administrativo`.slice(0, 85), 14, altoPagina - 8);
      pdf.text(`Página ${pagina} de ${totalPaginas}`, anchoPagina - 14, altoPagina - 8, { align: 'right' });
    }

    const fechaArchivo = this.obtenerFechaArchivo();
    const periodoArchivo = this.periodo.toLowerCase().replace(/_/g, '-');
    const canalArchivo = 'ecommerce';

    pdf.save(`reporte-general-${periodoArchivo}-${canalArchivo}-${fechaArchivo}.pdf`);
  }

  private obtenerNombrePeriodo(): string {
    const periodos: Record<string, string> = {
      HOY: 'Hoy',
      AYER: 'Ayer',
      '7': 'Últimos 7 días',
      '15': 'Últimos 15 días',
      '30': 'Últimos 30 días',
      MES: 'Este mes',
      ANIO: 'Este año',
      ULTIMO_ANIO: 'Último año',
      TODO: 'Todo el período'
    };
    return periodos[this.periodo] ?? 'Todo el período';
  }

  private obtenerNombreCanal(): string {
    return 'E-commerce';
  }

  private formatearMonedaPDF(valor: number): string {
    return `S/ ${Number(valor ?? 0).toFixed(2)}`;
  }

  private obtenerUltimaPosicionPDF(pdf: jsPDF): number {
    const documento = pdf as jsPDF & { lastAutoTable?: { finalY?: number } };
    return documento.lastAutoTable?.finalY ?? 20;
  }

  private verificarEspacioPDF(pdf: jsPDF, posicionY: number, espacioNecesario: number): void {
    const altoPagina = pdf.internal.pageSize.getHeight();
    if (posicionY + espacioNecesario > altoPagina - 20) {
      pdf.addPage();
    }
  }

  private obtenerFechaArchivo(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  exportarExcel(): void {
    const libro = XLSX.utils.book_new();
    const periodo = this.obtenerNombrePeriodo();
    const canal = this.obtenerNombreCanal();
    const generado = new Date().toLocaleString('es-PE');

    const resumen = [
      [`${this.nombreTienda} - REPORTE DE VENTAS`],
      [],
      ['Período', periodo],
      ['Canal', canal],
      ['Generado', generado],
      [],
      ['INDICADOR', 'VALOR'],
      ['Ventas totales', this.totalVentas],
      ['Ingresos', this.ingresosTotales],
      ['Unidades vendidas', this.unidadesVendidas],
      ['Venta promedio', this.ventaPromedio],
      ['Ventas online', this.ventasOnline],
      [],
      ['INVENTARIO', 'VALOR'],
      ['Stock total', this.stockTotal],
      ['Stock bajo', this.stockBajo],
      ['Sin stock', this.sinStock],
      ['Productos activos', this.productosActivos],
      [],
      ['USUARIOS', 'VALOR'],
      ['Clientes online', this.totalClientes],
      ['Usuarios totales', this.totalUsuarios],
      ['Cuentas activas', this.usuariosActivos],
      [],
      ['Producto líder', this.productoMasVendido?.nombre ?? 'Sin datos'],
      ['Unidades del producto líder', this.productoMasVendido?.cantidad ?? 0]
    ];

    const hojaResumen = XLSX.utils.aoa_to_sheet(resumen);
    hojaResumen['!cols'] = [{ wch: 30 }, { wch: 28 }];
    this.aplicarFormatoMonedaExcel(hojaResumen, ['B9', 'B11']);
    XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

    const ventas = this.ventasFiltradas.map(venta => ({
      'ID Venta': venta.idVenta,
      'Fecha': this.formatearFechaExcel(venta.fechaVenta),
      'Canal': 'ONLINE',
      'ID Usuario': venta.idUsuario ?? '',
      'Nombre': venta.nombreCliente ?? '',
      'Apellido': venta.apellidoCliente ?? '',
      'Correo': venta.correoCliente ?? '',
      'Tipo documento': venta.tipoDocumento ?? '',
      'Número documento': venta.numeroDocumento ?? '',
      'Medio de pago': venta.medioPago ?? '',
      'Estado venta': venta.estado ?? '',
      'Estado pedido': venta.estadoPedido ?? '',
      'Total': Number(venta.total ?? 0)
    }));

    const hojaVentas = XLSX.utils.json_to_sheet(ventas.length > 0 ? ventas : [{ 'Sin datos': 'No existen ventas para el filtro seleccionado' }]);
    hojaVentas['!cols'] = [
      { wch: 11 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
      { wch: 22 }, { wch: 22 }, { wch: 30 }, { wch: 18 },
      { wch: 20 }, { wch: 17 }, { wch: 17 }, { wch: 20 }, { wch: 14 }
    ];
    if (ventas.length > 0) {
      hojaVentas['!autofilter'] = { ref: hojaVentas['!ref'] ?? 'A1:M1' };
      this.aplicarFormatoColumnaMonedaExcel(hojaVentas, 12, ventas.length + 1);
    }
    XLSX.utils.book_append_sheet(libro, hojaVentas, 'Ventas');

    const detallesFiltrados = this.detallesPeriodo();
    const detalles = detallesFiltrados.map(detalle => ({
      'ID Detalle': detalle.idDetalleVenta,
      'ID Venta': detalle.idVenta,
      'Producto': detalle.productoTalla?.producto?.nombre ?? 'Sin producto',
      'Categoría': detalle.productoTalla?.producto?.categoria?.nombreCategoria ?? 'Sin categoría',
      'Cantidad': Number(detalle.cantidad ?? 0),
      'Precio unitario': Number(detalle.precioUnitario ?? 0),
      'Subtotal': Number(detalle.subtotal ?? 0)
    }));

    const hojaDetalles = XLSX.utils.json_to_sheet(detalles.length > 0 ? detalles : [{ 'Sin datos': 'No existen detalles para el filtro seleccionado' }]);
    hojaDetalles['!cols'] = [
      { wch: 12 }, { wch: 11 }, { wch: 34 }, { wch: 22 },
      { wch: 12 }, { wch: 16 }, { wch: 14 }
    ];
    if (detalles.length > 0) {
      hojaDetalles['!autofilter'] = { ref: hojaDetalles['!ref'] ?? 'A1:G1' };
      this.aplicarFormatoColumnaMonedaExcel(hojaDetalles, 5, detalles.length + 1);
      this.aplicarFormatoColumnaMonedaExcel(hojaDetalles, 6, detalles.length + 1);
    }
    XLSX.utils.book_append_sheet(libro, hojaDetalles, 'Detalle Ventas');

    const productos = this.productosVendidos.map((producto, index) => ({
      'Posición': index + 1,
      'ID Producto': producto.idProducto,
      'Producto': producto.nombre,
      'Categoría': producto.categoria,
      'Unidades': producto.cantidad,
      'Ingresos': producto.ingresos,
      'Rendimiento %': Number(producto.porcentaje.toFixed(2))
    }));

    const hojaProductos = XLSX.utils.json_to_sheet(productos.length > 0 ? productos : [{ 'Sin datos': 'No existen productos vendidos para el filtro seleccionado' }]);
    hojaProductos['!cols'] = [
      { wch: 10 }, { wch: 13 }, { wch: 34 }, { wch: 22 },
      { wch: 12 }, { wch: 14 }, { wch: 16 }
    ];
    if (productos.length > 0) {
      hojaProductos['!autofilter'] = { ref: hojaProductos['!ref'] ?? 'A1:G1' };
      this.aplicarFormatoColumnaMonedaExcel(hojaProductos, 5, productos.length + 1);
      this.aplicarFormatoColumnaPorcentajeExcel(hojaProductos, 6, productos.length + 1);
    }
    XLSX.utils.book_append_sheet(libro, hojaProductos, 'Productos');

    const mediosPago = this.mediosPago.map(medio => ({
      'Medio de pago': medio.nombre,
      'Ventas': medio.cantidad,
      'Total': medio.total,
      'Participación %': Number(medio.porcentaje.toFixed(2))
    }));

    const hojaMediosPago = XLSX.utils.json_to_sheet(mediosPago.length > 0 ? mediosPago : [{ 'Sin datos': 'No existen medios de pago para el filtro seleccionado' }]);
    hojaMediosPago['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 18 }];
    if (mediosPago.length > 0) {
      hojaMediosPago['!autofilter'] = { ref: hojaMediosPago['!ref'] ?? 'A1:D1' };
      this.aplicarFormatoColumnaMonedaExcel(hojaMediosPago, 2, mediosPago.length + 1);
      this.aplicarFormatoColumnaPorcentajeExcel(hojaMediosPago, 3, mediosPago.length + 1);
    }
    XLSX.utils.book_append_sheet(libro, hojaMediosPago, 'Medios de Pago');

    const categorias = this.categorias.map(categoria => ({
      'Categoría': categoria.nombre,
      'Unidades': categoria.cantidad,
      'Ingresos': categoria.ingresos,
      'Rendimiento %': Number(categoria.porcentaje.toFixed(2))
    }));

    const hojaCategorias = XLSX.utils.json_to_sheet(categorias.length > 0 ? categorias : [{ 'Sin datos': 'No existen categorías para el filtro seleccionado' }]);
    hojaCategorias['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 18 }];
    if (categorias.length > 0) {
      hojaCategorias['!autofilter'] = { ref: hojaCategorias['!ref'] ?? 'A1:D1' };
      this.aplicarFormatoColumnaMonedaExcel(hojaCategorias, 2, categorias.length + 1);
      this.aplicarFormatoColumnaPorcentajeExcel(hojaCategorias, 3, categorias.length + 1);
    }
    XLSX.utils.book_append_sheet(libro, hojaCategorias, 'Categorías');

    const canales = this.canales.map(item => ({
      'Canal': item.nombre,
      'Ventas': item.cantidad,
      'Total': item.total,
      'Participación %': Number(item.porcentaje.toFixed(2))
    }));

    const hojaCanales = XLSX.utils.json_to_sheet(canales.length > 0 ? canales : [{ 'Sin datos': 'No existen canales para el filtro seleccionado' }]);
    hojaCanales['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 18 }];
    if (canales.length > 0) {
      hojaCanales['!autofilter'] = { ref: hojaCanales['!ref'] ?? 'A1:D1' };
      this.aplicarFormatoColumnaMonedaExcel(hojaCanales, 2, canales.length + 1);
      this.aplicarFormatoColumnaPorcentajeExcel(hojaCanales, 3, canales.length + 1);
    }
    XLSX.utils.book_append_sheet(libro, hojaCanales, 'Canales');

    const inventario = [
      ['INDICADOR', 'VALOR'],
      ['Stock total', this.stockTotal],
      ['Stock bajo', this.stockBajo],
      ['Sin stock', this.sinStock],
      ['Productos activos', this.productosActivos]
    ];
    const hojaInventario = XLSX.utils.aoa_to_sheet(inventario);
    hojaInventario['!cols'] = [{ wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(libro, hojaInventario, 'Inventario');

    const usuarios = [
      ['INDICADOR', 'VALOR'],
      ['Clientes online', this.totalClientes],
      ['Usuarios totales', this.totalUsuarios],
      ['Cuentas activas', this.usuariosActivos]
    ];
    const hojaUsuarios = XLSX.utils.aoa_to_sheet(usuarios);
    hojaUsuarios['!cols'] = [{ wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(libro, hojaUsuarios, 'Usuarios');

    const periodoArchivo = this.periodo.toLowerCase().replace(/_/g, '-');
    const canalArchivo = 'ecommerce';
    const fechaArchivo = this.obtenerFechaArchivo();

    XLSX.writeFile(
      libro,
      `reporte-general-${periodoArchivo}-${canalArchivo}-${fechaArchivo}.xlsx`,
      { compression: true }
    );
  }

  private formatearFechaExcel(fecha: string): string {
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) return fecha ?? '';

    return valor.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private aplicarFormatoMonedaExcel(hoja: XLSX.WorkSheet, celdas: string[]): void {
    celdas.forEach(referencia => {
      const celda = hoja[referencia];
      if (celda && typeof celda.v === 'number') {
        celda.t = 'n';
        celda.z = '"S/ "#,##0.00';
      }
    });
  }

  private aplicarFormatoColumnaMonedaExcel(hoja: XLSX.WorkSheet, columna: number, filaFinal: number): void {
    for (let fila = 2; fila <= filaFinal; fila++) {
      const referencia = XLSX.utils.encode_cell({ r: fila - 1, c: columna });
      const celda = hoja[referencia];
      if (celda && typeof celda.v === 'number') {
        celda.t = 'n';
        celda.z = '"S/ "#,##0.00';
      }
    }
  }

  private aplicarFormatoColumnaPorcentajeExcel(hoja: XLSX.WorkSheet, columna: number, filaFinal: number): void {
    for (let fila = 2; fila <= filaFinal; fila++) {
      const referencia = XLSX.utils.encode_cell({ r: fila - 1, c: columna });
      const celda = hoja[referencia];
      if (celda && typeof celda.v === 'number') celda.z = '0.00"%"';
    }
  }
}
