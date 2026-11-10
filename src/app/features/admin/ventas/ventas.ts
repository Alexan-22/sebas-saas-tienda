import { GestionEnvios } from './gestion-envios';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Venta,
  DetalleVenta,
  DetalleCompraResponse
} from '../../../core/models/venta-detalle';

import {
  VentaService
} from '../../../core/services/venta';


@Component({
  selector: 'app-ventas',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule, GestionEnvios
  ],

  templateUrl: './ventas.html',
  styleUrl: './ventas.css'
})
export class Ventas implements OnInit {

  // =========================================================
  // VENTAS
  // =========================================================

  ventas: Venta[] = [];

  ventasFiltradas: Venta[] = [];

  busqueda = '';

  filtroTipoVenta = '';

  filtroPago = '';

  filtroEstado = '';

  cargando = true;

  error = '';


  // =========================================================
  // DETALLE
  // =========================================================

  ventaSeleccionada: Venta | null = null;

  detalleSeleccionado:
    DetalleCompraResponse | null = null;

  detalles: DetalleVenta[] = [];

  cargandoDetalle = false;

  errorDetalle = '';


  constructor(
    private ventaService: VentaService,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================================================
  // INICIALIZAR
  // =========================================================

  ngOnInit(): void {

    this.cargarVentas();
  }


  // =========================================================
  // CARGAR VENTAS
  // =========================================================

  cargarVentas(): void {

    this.cargando = true;

    this.error = '';

    this.ventaService
      .listarTodas()
      .subscribe({

        next: (
          ventas: Venta[]
        ) => {

          this.ventas =
            ventas ?? [];

          this.ventas.sort(
            (
              a: Venta,
              b: Venta
            ) => {

              const fechaA =
                new Date(
                  a.fechaVenta
                ).getTime();

              const fechaB =
                new Date(
                  b.fechaVenta
                ).getTime();

              return fechaB - fechaA;
            }
          );

          this.aplicarFiltros();

          this.cargando = false;

          this.cdr.detectChanges();
        },


        error: (
          error: unknown
        ) => {

          console.error(
            'Error cargando ventas:',
            error
          );

          this.error =
            'No se pudieron cargar las ventas.';

          this.cargando = false;

          this.cdr.detectChanges();
        }

      });
  }


  // =========================================================
  // FILTROS
  // =========================================================

  aplicarFiltros(): void {

    const texto =
      this.busqueda
        .trim()
        .toLowerCase();

    this.ventasFiltradas =
      this.ventas.filter(
        (
          venta: Venta
        ) => {

          const id =
            String(
              venta.idVenta
            );

          const nombre =
            (
              `${venta.nombreCliente ?? ''} ` +
              `${venta.apellidoCliente ?? ''}`
            )
              .trim()
              .toLowerCase();

          const correo =
            venta.correoCliente
              ?.toLowerCase() ?? '';

          const documento =
            (
              `${venta.tipoDocumento ?? ''} ` +
              `${venta.numeroDocumento ?? ''}`
            )
              .trim()
              .toLowerCase();

          const tipoVenta =
            venta.tipoVenta
              ?.toUpperCase() ?? '';

          const medioPago =
            venta.medioPago
              ?.toUpperCase() ?? '';

          const estado =
            venta.estado
              ?.toUpperCase() ?? '';

          const coincideBusqueda =
            !texto ||
            id.includes(texto) ||
            nombre.includes(texto) ||
            correo.includes(texto) ||
            documento.includes(texto);

          const coincideTipo =
            !this.filtroTipoVenta ||
            tipoVenta ===
              this.filtroTipoVenta;

          const coincidePago =
            !this.filtroPago ||
            medioPago ===
              this.filtroPago;

          const coincideEstado =
            !this.filtroEstado ||
            estado ===
              this.filtroEstado;

          return (
            coincideBusqueda &&
            coincideTipo &&
            coincidePago &&
            coincideEstado
          );
        }
      );
  }


  // =========================================================
  // LIMPIAR FILTROS
  // =========================================================

  limpiarFiltros(): void {

    this.busqueda = '';

    this.filtroTipoVenta = '';

    this.filtroPago = '';

    this.filtroEstado = '';

    this.aplicarFiltros();
  }


  // =========================================================
  // DETALLE
  // =========================================================

  verDetalle(
    venta: Venta
  ): void {

    this.ventaSeleccionada =
      venta;

    this.detalleSeleccionado =
      null;

    this.detalles = [];

    this.errorDetalle = '';

    this.cargandoDetalle = true;

    this.cdr.detectChanges();

    this.ventaService
      .detalleVentaAdmin(
        venta.idVenta
      )
      .subscribe({

        next: (
          respuesta:
            DetalleCompraResponse
        ) => {

          this.detalleSeleccionado =
            respuesta;

          this.detalles =
            respuesta.detalles ?? [];

          this.cargandoDetalle =
            false;

          this.cdr.detectChanges();
        },


        error: (
          error: unknown
        ) => {

          console.error(
            'Error cargando detalle:',
            error
          );

          this.detalleSeleccionado =
            null;

          this.detalles = [];

          this.errorDetalle =
            'No se pudo cargar el detalle de la venta.';

          this.cargandoDetalle =
            false;

          this.cdr.detectChanges();
        },


        complete: () => {

          this.cargandoDetalle =
            false;

          this.cdr.detectChanges();
        }

      });
  }


  cerrarDetalle(): void {

    this.ventaSeleccionada =
      null;

    this.detalleSeleccionado =
      null;

    this.detalles = [];

    this.errorDetalle = '';

    this.cargandoDetalle =
      false;

    this.cdr.detectChanges();
  }


  // =========================================================
  // ESTADÍSTICAS
  // =========================================================

  get totalVentas(): number {

    return this.ventas.length;
  }


  get ingresosTotales(): number {

    return this.ventas.reduce(
      (
        total: number,
        venta: Venta
      ) => {

        return (
          total +
          Number(
            venta.total ?? 0
          )
        );
      },
      0
    );
  }


  get ventaPromedio(): number {

    if (
      this.totalVentas === 0
    ) {

      return 0;
    }

    return (
      this.ingresosTotales /
      this.totalVentas
    );
  }


  get ventasOnline(): number {

    return this.ventas.filter(
      (
        venta: Venta
      ) =>
        venta.tipoVenta
          ?.toUpperCase() ===
        'ONLINE'
    ).length;
  }


  get ventasPresenciales(): number {

    return this.ventas.filter(
      (
        venta: Venta
      ) =>
        venta.tipoVenta
          ?.toUpperCase() ===
        'PRESENCIAL'
    ).length;
  }


  get ventasEfectivo(): number {

    return this.ventas.filter(
      (
        venta: Venta
      ) =>
        venta.medioPago
          ?.toUpperCase() ===
        'EFECTIVO'
    ).length;
  }


  get ventasYape(): number {

    return this.ventas.filter(
      (
        venta: Venta
      ) =>
        venta.medioPago
          ?.toUpperCase() ===
        'YAPE'
    ).length;
  }


  get ventasTarjeta(): number {

    return this.ventas.filter(
      (
        venta: Venta
      ) =>
        venta.medioPago
          ?.toUpperCase() ===
        'TARJETA'
    ).length;
  }


  // =========================================================
  // ESTADOS
  // =========================================================

  get estados(): string[] {

    return [
      ...new Set(
        this.ventas
          .map(
            (
              venta: Venta
            ) =>
              venta.estado
          )
          .filter(
            (
              estado: string
            ) =>
              Boolean(
                estado
              )
          )
      )
    ];
  }


  // =========================================================
  // CLIENTE
  // =========================================================

  nombreCliente(
    venta: Venta
  ): string {

    const nombre =
      (
        `${venta.nombreCliente ?? ''} ` +
        `${venta.apellidoCliente ?? ''}`
      ).trim();

    return (
      nombre ||
      'Sin cliente'
    );
  }


  informacionCliente(
    venta: Venta
  ): string {

    if (
      venta.tipoVenta ===
        'PRESENCIAL'
    ) {

      const documento =
        (
          `${venta.tipoDocumento ?? ''} ` +
          `${venta.numeroDocumento ?? ''}`
        ).trim();

      if (documento) {

        return documento;
      }

      if (venta.correoCliente) {

        return venta.correoCliente;
      }

      return 'Cliente presencial';
    }

    return (
      venta.correoCliente ??
      'Sin correo'
    );
  }


  // =========================================================
  // ETIQUETA TIPO DE VENTA
  // =========================================================

  tipoVentaTexto(
    venta: Venta
  ): string {

    return (
      venta.tipoVenta ===
        'PRESENCIAL'
        ? 'Presencial'
        : 'Online'
    );
  }


  // =========================================================
  // DETALLE
  // =========================================================

  get cantidadProductosDetalle(): number {

    return this.detalles.reduce(
      (
        total: number,
        detalle: DetalleVenta
      ) => {

        return (
          total +
          Number(
            detalle.cantidad ?? 0
          )
        );
      },
      0
    );
  }


  get subtotalDetalle(): number {

    if (
      this.detalleSeleccionado
        ?.subtotal !== null &&
      this.detalleSeleccionado
        ?.subtotal !== undefined
    ) {

      return Number(
        this.detalleSeleccionado
          .subtotal
      );
    }

    return this.detalles.reduce(
      (
        total: number,
        detalle: DetalleVenta
      ) => {

        return (
          total +
          Number(
            detalle.subtotal ?? 0
          )
        );
      },
      0
    );
  }


  get costoDeliveryDetalle(): number {

    return Number(
      this.detalleSeleccionado
        ?.costoDelivery ?? 0
    );
  }


  get totalDetalle(): number {

    return Number(
      this.detalleSeleccionado
        ?.total ??
      this.ventaSeleccionada
        ?.total ??
      0
    );
  }


  // =========================================================
  // DIRECCIÓN
  // =========================================================

  get ubicacionEntrega(): string {

    const direccion =
      this.detalleSeleccionado
        ?.direccionEnvio;

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
}