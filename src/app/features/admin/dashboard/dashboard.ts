
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ProductoService } from '../../../core/services/producto';
import { ProductoTallaService } from '../../../core/services/producto-talla';
import { VentaService } from '../../../core/services/venta';
import { TiendaService } from '../../../core/services/tienda.service';

import { Venta } from '../../../core/models/venta-detalle';
import { ProductoTalla } from '../../../core/models/producto-talla';

export type PeriodoFiltro = 'Semana' | 'Mes' | 'Trimestre';

interface BarraVentas {
  etiqueta: string;
  total: number;
  porcentaje: number;
}

interface AlertaStock {
  nombre: string;
  talla: string;
  stock: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  periodoActivo: PeriodoFiltro = 'Semana';

  totalProductos: number | null = null;
  totalVentasConteo: number | null = null;
  montoTotalVentas: number | null = null;
  totalStock: number | null = null;
  totalAlertas: number | null = null;

  barrasVentas: BarraVentas[] = [];
  alertasStock: AlertaStock[] = [];

  errorVentas = '';
  errorInventario = '';

  private ventas: Venta[] = [];

  constructor(
    private productoService: ProductoService,
    private productoTallaService: ProductoTallaService,
    private ventaService: VentaService,
    public tiendaService: TiendaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarVentas();
    this.cargarProductos();
  }

  cambiarPeriodo(periodo: PeriodoFiltro): void {
    this.periodoActivo = periodo;

    if (!this.errorVentas) {
      this.calcularIndicadores();
    }
  }

  irAPedidos(): void {
    void this.router.navigate(['/admin/ventas']);
  }

  private cargarVentas(): void {
    this.errorVentas = '';

    this.ventaService.listarTodas().subscribe({
      next: ventas => {
        this.ventas = ventas ?? [];
        this.calcularIndicadores();
      },
      error: error => {
        console.error('Error cargando ventas:', error);
        this.errorVentas = 'No se pudieron consultar las ventas.';
        this.totalVentasConteo = null;
        this.montoTotalVentas = null;
        this.barrasVentas = [];
        this.actualizarVista();
      }
    });
  }

  private inicioPeriodo(ahora: Date): Date {
    const inicio = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate()
    );

    if (this.periodoActivo === 'Semana') {
      const dia = inicio.getDay();
      const desplazamiento = (dia + 6) % 7;
      inicio.setDate(inicio.getDate() - desplazamiento);
    } else if (this.periodoActivo === 'Mes') {
      inicio.setDate(1);
    } else {
      const inicioTrimestre =
        Math.floor(inicio.getMonth() / 3) * 3;

      inicio.setMonth(inicioTrimestre, 1);
    }

    return inicio;
  }

  private ventaContabilizable(venta: Venta): boolean {
    const estado = String(venta.estado ?? '').toUpperCase();
    const pedido = String(venta.estadoPedido ?? '').toUpperCase();

    const cancelados = [
      'CANCELADO',
      'CANCELADA',
      'ANULADO',
      'ANULADA'
    ];

    return !cancelados.includes(estado)
      && !cancelados.includes(pedido);
  }

  private calcularIndicadores(): void {
    const ahora = new Date();
    const inicio = this.inicioPeriodo(ahora);

    const fin = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate() + 1
    );

    const ventasPeriodo = this.ventas.filter(venta => {
      const fecha = new Date(venta.fechaVenta);

      return !Number.isNaN(fecha.getTime())
        && fecha >= inicio
        && fecha < fin;
    });

    this.totalVentasConteo = ventasPeriodo.length;

    const ventasValidas = ventasPeriodo.filter(
      venta => this.ventaContabilizable(venta)
    );

    this.montoTotalVentas = ventasValidas.reduce(
      (total, venta) => total + Number(venta.total ?? 0),
      0
    );

    this.generarGrafico(ventasValidas, inicio, fin);

    this.actualizarVista();
  }

  private generarGrafico(
    ventas: Venta[],
    inicio: Date,
    fin: Date
  ): void {

    const inicioMs = inicio.getTime();
    const finMs = fin.getTime();
    const duracion = finMs - inicioMs;

    const cantidades = Array<number>(7).fill(0);

    for (const venta of ventas) {
      const fecha = new Date(venta.fechaVenta).getTime();

      const indice = Math.min(
        6,
        Math.max(0, Math.floor((fecha - inicioMs) / duracion * 7))
      );

      cantidades[indice] += Number(venta.total ?? 0);
    }

    const etiquetasSemana = [
      'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'
    ];

    const maximo = Math.max(0, ...cantidades);

    this.barrasVentas = cantidades.map((total, indice) => ({
      etiqueta: this.periodoActivo === 'Semana'
        ? etiquetasSemana[indice]
        : `${indice + 1}`,
      total,
      porcentaje: maximo > 0 ? (total / maximo) * 100 : 0
    }));
  }

  private cargarProductos(): void {
    this.errorInventario = '';

    this.productoService.listar().subscribe({
      next: productos => {
        const activos = (productos ?? []).filter(p => p.estado);

        this.totalProductos = activos.length;

        if (!activos.length) {
          this.totalStock = 0;
          this.totalAlertas = 0;
          this.alertasStock = [];
          this.actualizarVista();
          return;
        }

        const consultas = activos.map(producto =>
          this.productoTallaService
            .listarPorProducto(producto.idProducto)
            .pipe(
              catchError(error => {
                console.error(
                  'Error consultando stock de producto:',
                  producto.idProducto,
                  error
                );
                return of(null);
              })
            )
        );

        forkJoin(consultas).subscribe({
          next: resultados => {
            if (resultados.some(resultado => resultado === null)) {
              this.errorInventario =
                'No se pudo consultar todo el inventario.';
              this.totalStock = null;
              this.totalAlertas = null;
              this.alertasStock = [];
              this.actualizarVista();
              return;
            }

            const tallas = resultados.flatMap(
              resultado => resultado ?? []
            ) as ProductoTalla[];

            this.totalStock = tallas.reduce(
              (total, item) => total + Number(item.stock ?? 0),
              0
            );

            const criticos = tallas.filter(
              item => Number(item.stock ?? 0) <= 5
            );

            this.totalAlertas = criticos.length;

            this.alertasStock = criticos
              .map(item => ({
                nombre: item.producto?.nombre ?? 'Producto',
                talla: item.talla?.nombreTalla ?? 'Sin talla',
                stock: Number(item.stock ?? 0)
              }))
              .sort((a, b) => a.stock - b.stock)
              .slice(0, 5);

            this.actualizarVista();
          },
          error: error => {
            console.error('Error general de inventario:', error);
            this.errorInventario = 'No se pudo cargar el inventario.';
            this.totalStock = null;
            this.totalAlertas = null;
            this.actualizarVista();
          }
        });
      },
      error: error => {
        console.error('Error cargando productos:', error);
        this.errorInventario = 'No se pudo cargar el catálogo.';
        this.totalProductos = null;
        this.totalStock = null;
        this.totalAlertas = null;
        this.actualizarVista();
      }
    });
  }

  private actualizarVista(): void {
    this.cdr.detectChanges();
  }
}
