
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import {
  ConfiguracionSandbox,
  EstadoPago,
  PagoPersistente,
  PagosService
} from '../../../core/services/pagos.service';

@Component({
  selector: 'app-pagos-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagos.html'
})
export class PagosAdmin implements OnInit {
  private readonly api = inject(PagosService);

  readonly pagos = signal<PagoPersistente[]>([]);
  readonly configuracion = signal<ConfiguracionSandbox | null>(null);
  readonly detalle = signal<PagoPersistente | null>(null);

  readonly pagina = signal(0);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');

  readonly pendientes = computed(() =>
    this.pagos().filter(p => p.estado === 'PENDIENTE').length
  );

  readonly aprobados = computed(() =>
    this.pagos().filter(p => p.estado === 'APROBADO').length
  );

  readonly rechazados = computed(() =>
    this.pagos().filter(p => p.estado === 'RECHAZADO').length
  );

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (this.cargando()) return;

    this.cargando.set(true);
    this.error.set('');
    this.detalle.set(null);

    forkJoin({
      configuracion: this.api.configuracion(),
      pagos: this.api.listar(this.pagina())
    }).subscribe({
      next: resultado => {
        this.configuracion.set(resultado.configuracion);
        this.pagos.set(resultado.pagos);
        this.detalle.set(null);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.pagos.set([]);
        this.configuracion.set(null);
        this.error.set(this.mensajeError(error));
      }
    });
  }

  cambiarConfiguracion(): void {
    const config = this.configuracion();

    if (!config || this.guardando()) return;

    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');

    this.api.actualizarConfiguracion(
      !config.habilitado
    ).subscribe({
      next: actualizada => {
        this.configuracion.set(actualizada);
        this.guardando.set(false);
        this.aviso.set(
          actualizada.habilitado
            ? 'Sandbox habilitado para esta tienda.'
            : 'Sandbox deshabilitado para esta tienda.'
        );
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(error));
      }
    });
  }

  verDetalle(id: string): void {
    if (this.cargandoDetalle()) return;

    this.cargandoDetalle.set(true);
    this.error.set('');
    this.detalle.set(null);

    this.api.consultar(id).subscribe({
      next: pago => {
        this.detalle.set(pago);
        this.cargandoDetalle.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoDetalle.set(false);
        this.error.set(
          error.status === 404
            ? 'El pago no existe en esta tienda.'
            : this.mensajeError(error)
        );
      }
    });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
  }

  siguientePagina(): void {
    if (this.cargando() || this.pagos().length < 50) return;

    this.pagina.update(pagina => pagina + 1);
    this.cargar();
  }

  anteriorPagina(): void {
    if (this.cargando() || this.pagina() === 0) return;

    this.pagina.update(pagina => pagina - 1);
    this.cargar();
  }

  
nombreEstado(estado: EstadoPago): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente';

    case 'APROBADO':
      return 'Aprobado';

    case 'RECHAZADO':
      return 'Rechazado';

    case 'EXPIRADO':
      return 'Expirado';

    case 'REEMBOLSADO':
      return 'Reembolsado';

    default:
      return 'Desconocido';
  }
}

colorEstado(estado: EstadoPago): string {
  switch (estado) {
    case 'APROBADO':
      return 'bg-emerald-100 text-emerald-800';

    case 'PENDIENTE':
      return 'bg-amber-100 text-amber-800';

    case 'RECHAZADO':
    case 'EXPIRADO':
      return 'bg-red-100 text-red-800';

    case 'REEMBOLSADO':
      return 'bg-slate-200 text-slate-700';

    default:
      return 'bg-slate-100 text-slate-700';
  }
}


  private mensajeError(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'No se pudo conectar con el backend.';
      case 401:
        return 'HTTP 401: inicia sesión nuevamente en el dominio de tu tienda.';
      case 403:
        return 'HTTP 403: acceso denegado por permisos o por la política del entorno sandbox.';
      case 404:
        return 'HTTP 404: la ruta de pagos no está disponible en este entorno.';
      case 500:
        return 'HTTP 500: el backend no pudo procesar los pagos. Revisa el registro del servidor.';
      case 502:
      case 503:
      case 504:
        return `HTTP ${error.status}: el backend no está disponible a través del proxy. Revisa su arranque y conexión.`;
      default:
        return `HTTP ${error.status}: no se pudo completar la operación de pagos.`;
    }
  }
}

