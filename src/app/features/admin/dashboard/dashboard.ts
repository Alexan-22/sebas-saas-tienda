import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ProductoService } from '../../../core/services/producto';
import { ProductoTallaService } from '../../../core/services/producto-talla';
import { VentaService } from '../../../core/services/venta';
import { UsuarioService } from '../../../core/services/usuario';
import { TiendaService } from '../../../core/services/tienda.service';

export type PeriodoFiltro = 'Semana' | 'Mes' | 'Trimestre';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  // Filtro de período de tiempo activo
  periodoActivo: PeriodoFiltro = 'Semana';

  // Métricas dinámicas
  totalProductos: number | null = null;
  totalVentasConteo: number | null = null;
  montoTotalVentas: number = 12850.00;
  totalClientes: number | null = null;
  totalStock: number | null = null;

  constructor(
    private productoService: ProductoService,
    private productoTallaService: ProductoTallaService,
    private ventaService: VentaService,
    private usuarioService: UsuarioService,
    public tiendaService: TiendaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  // ==========================================
  // CAMBIAR PERÍODO DE TIEMPO (Semana / Mes / Trimestre)
  // ==========================================
  cambiarPeriodo(periodo: PeriodoFiltro): void {
    this.periodoActivo = periodo;
    
    // Recalcula el monto visual según el período seleccionado
    if (periodo === 'Semana') {
      this.montoTotalVentas = 12850.00;
    } else if (periodo === 'Mes') {
      this.montoTotalVentas = 48500.00;
    } else if (periodo === 'Trimestre') {
      this.montoTotalVentas = 135200.00;
    }

    this.actualizarVista();
  }

  // ==========================================
  // ACCIÓN DEL BOTÓN: + NUEVA VENTA
  // ==========================================
  irANuevaVenta(): void {
    // Redirige al Punto de Venta / Registro de venta presencial
    this.router.navigate(['/admin/vender']);
  }

  // ==========================================
  // CARGA DE DATOS DESDE SERVICIOS
  // ==========================================
  private cargarDatos(): void {
    this.cargarProductos();
    this.cargarVentas();
    this.cargarUsuarios();
  }

  private cargarProductos(): void {
    this.productoService.listar().subscribe({
      next: productos => {
        this.totalProductos = productos.length;

        if (productos.length === 0) {
          this.totalStock = 0;
          this.actualizarVista();
          return;
        }

        const consultasStock = productos.map(producto =>
          this.productoTallaService.listarPorProducto(producto.idProducto).pipe(
            catchError(() => of([]))
          )
        );

        forkJoin(consultasStock).subscribe({
          next: resultados => {
            this.totalStock = resultados.reduce((totalGeneral, tallas) => {
              const stockProducto = tallas.reduce((total, productoTalla) =>
                total + Number(productoTalla.stock || 0), 0
              );
              return totalGeneral + stockProducto;
            }, 0);

            this.actualizarVista();
          },
          error: error => {
            console.error('Error calculando stock:', error);
            this.totalStock = 0;
            this.actualizarVista();
          }
        });

        this.actualizarVista();
      },
      error: error => {
        console.error('Error cargando productos:', error);
        this.totalProductos = 0;
        this.totalStock = 0;
        this.actualizarVista();
      }
    });
  }

  private cargarVentas(): void {
    this.ventaService.listarTodas().subscribe({
      next: ventas => {
        this.totalVentasConteo = ventas.length;
        this.actualizarVista();
      },
      error: error => {
        console.error('Error cargando ventas:', error);
        this.totalVentasConteo = 0;
        this.actualizarVista();
      }
    });
  }

  private cargarUsuarios(): void {
    this.usuarioService.listarTodos().subscribe({
      next: usuarios => {
        this.totalClientes = usuarios.filter(usuario =>
          usuario.rol?.toUpperCase() === 'CLIENTE'
        ).length;

        this.actualizarVista();
      },
      error: error => {
        console.error('Error cargando usuarios:', error);
        this.totalClientes = 0;
        this.actualizarVista();
      }
    });
  }

  private actualizarVista(): void {
    this.cdr.detectChanges();
  }
}