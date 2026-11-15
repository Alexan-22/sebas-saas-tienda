import { ReportesPdfService } from './reportes-pdf.service';
import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
import { CsvExportService } from '../../../shared/export/csv-export.service';
import { SeparadorCsv } from '../../../shared/export/csv-export';
import { enPeriodo, fechaHoraLima, fechaLima } from '../../../shared/export/fecha-lima';
import { crearReporteCsv, GRUPOS_REPORTES_CSV, requierePagos, TipoReporteCsv, ventaContabilizable } from './reportes-csv';
import { YapePagosService } from '../../../core/services/yape-pagos.service';
import { TransferenciasService } from '../../../core/services/transferencias.service';
import { ContraEntregaService } from '../../../core/services/contraentrega';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TiendaService } from '../../../core/services/tienda.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

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
  private readonly csv = inject(CsvExportService);
  private readonly pdf = inject(ReportesPdfService);
  private readonly yape = inject(YapePagosService);
  private readonly transferencias = inject(TransferenciasService);
  private readonly contraentrega = inject(ContraEntregaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly gruposReportesCsv = GRUPOS_REPORTES_CSV;
  reporteCsv: TipoReporteCsv = 'ventas';
  separadorCsv: SeparadorCsv = ';';
  cargandoCsv = false;
  errorCsv = '';
  errorPdf = '';
  mensajeCsv = '';
  private referenciaFiltro = new Date();
  private consultadoEn = new Date();
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
        this.reporteCsv = this.csvPorPestana(vista);
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
    if (this.cargandoCsv || (this.cargando && this.ventas.length > 0)) return;
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
        this.cdr.markForCheck();
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
        this.consultadoEn = new Date();
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: error => {
        console.error('Error cargando detalle o inventario de reportes:', error);
        this.error = 'No se pudieron cargar los detalles de ventas o el inventario de esta tienda.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  aplicarPeriodo(): void { this.aplicarFiltros(); }

  private aplicarFiltros(): void {
    this.referenciaFiltro = new Date();
    this.ventasFiltradas = this.ventas.filter(v => enPeriodo(v.fechaVenta,this.periodo,this.referenciaFiltro) && ventaContabilizable(v));
    this.generarProductosVendidos();
    this.generarMediosPago();
    this.generarCategorias();
    this.generarCanales();
  }

  fechaVisible(valor:string):string { return fechaHoraLima(valor) || 'Fecha no válida'; }

  private csvPorPestana(vista:PestanaReporte):TipoReporteCsv {
    return ({ventas:'ventas',inventario:'inventario',canales:'pagos',clientes:'clientes'} as const)[vista];
  }

  exportarCSV():void {
    if(this.cargando||this.error||this.cargandoCsv||this.stockIncompleto)return;
    this.errorCsv='';this.mensajeCsv='';
    const tipo=this.reporteCsv,separador=this.separadorCsv;
    const datos={ventas:[...this.ventas],detalles:[...this.detalles],productos:[...this.productos],inventario:[...this.inventario],usuarios:[...this.usuarios]};
    const contexto={periodo:this.periodo,referencia:new Date(this.referenciaFiltro),consultadoEn:new Date(this.consultadoEn),generadoEn:new Date()};
    const preparar=(pagos?:{yape:import('../../../core/services/yape-pagos.service').PagoYapeManual[];transferencias:import('../../../core/services/transferencias.service').PagoTransferencia[];contraentrega:import('../../../core/services/contraentrega').CobroContraEntrega[]})=>{
      try {
        if(pagos)contexto.consultadoEn=new Date();
        const tabla=crearReporteCsv(tipo,{...datos,...pagos},contexto);
        this.csv.descargar('reporte-'+tipo.replaceAll('_','-')+'-'+contexto.periodo.toLowerCase().replaceAll('_','-')+'-'+fechaLima(contexto.generadoEn).slice(0,10)+'.csv',tabla.cabeceras,tabla.filas,separador);
        this.mensajeCsv='CSV preparado: '+tabla.filas.length+' filas. Importes registrados y cobros se exportan por separado.';
      }catch(e){this.errorCsv=e instanceof Error?e.message:'No se pudo preparar el CSV.';}
    };
    if(!requierePagos(tipo)){preparar();return;}
    this.cargandoCsv=true;
    forkJoin({yape:this.yape.listarParaReportes(),transferencias:this.transferencias.listarParaReportes(),contraentrega:this.contraentrega.listarParaReportes()})
      .pipe(timeout(30000),takeUntilDestroyed(this.destroyRef),finalize(()=>{this.cargandoCsv=false;if(!this.destroyRef.destroyed)this.cdr.markForCheck();}))
      .subscribe({next:preparar,error:e=>{
        const estados:Record<number,string>={400:'Datos de consulta inválidos.',401:'La sesión venció. Inicia sesión nuevamente.',403:'No tienes permiso para consultar los pagos.',404:'No está disponible una fuente de pagos.',409:'Los registros cambiaron. Actualiza antes de exportar.',503:'Servicio no disponible. No se descargó un reporte parcial.'};
        this.errorCsv=e instanceof HttpErrorResponse?(estados[e.status]??'No se pudieron consultar todas las fuentes de pagos.'):'Se agotó el tiempo de consulta. No se descargó un reporte parcial.';
      }});
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
      const fecha = fechaHoraLima(venta.fechaVenta).slice(0, 10);
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
    if (this.cargando || this.cargandoCsv || this.error || this.stockIncompleto) return;
    this.errorPdf = '';
    try {
      const contexto = {
        periodo: this.periodo, referencia: new Date(this.referenciaFiltro),
        consultadoEn: new Date(this.consultadoEn), generadoEn: new Date()
      };
      const pdf = this.pdf.crear({
        ventas: this.ventas, detalles: this.detalles, productos: this.productos,
        inventario: this.inventario, usuarios: this.usuarios
      }, contexto, this.nombreTienda);
      pdf.save('reporte-general-' + this.periodo.toLowerCase().replaceAll('_','-') + '-' + fechaLima(contexto.generadoEn).slice(0,10) + '.pdf');
    } catch (e) {
      this.errorPdf = e instanceof Error ? e.message : 'No se pudo preparar el PDF.';
    }
  }
}
