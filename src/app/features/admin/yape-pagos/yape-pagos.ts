
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { YapeComprobanteAdminComponent } from '../../yape-comprobante/admin/yape-comprobante-admin';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, TimeoutError, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  EventoYape,
  PagoYapeManual,
  YapePagosService
} from '../../../core/services/yape-pagos.service';

@Component({
  selector: 'app-yape-pagos-admin',
  standalone: true,
  imports: [CommonModule, YapeComprobanteAdminComponent],
  templateUrl: './yape-pagos.html'
})
export class YapePagosAdmin implements OnInit {

  private readonly service = inject(YapePagosService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private cargaActual: Subscription | null = null;
  private auditoriaActual: Subscription | null = null;
  private versionCarga = 0;
  private versionAuditoria = 0;

  pagos: PagoYapeManual[] = [];
  cargando = false;
  operando: number | null = null;

  error = '';
  mensaje = '';

  auditoriaVenta: number | null = null;
  eventos: EventoYape[] = [];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const version = ++this.versionCarga;

    this.cargaActual?.unsubscribe();

    this.cargando = true;
    this.error = '';
    this.cdr.detectChanges();

    const consulta = this.service.listarAdmin()
      .pipe(
        timeout(30000),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: lista => {
          if (version !== this.versionCarga) return;

          if (Array.isArray(lista)) {
            this.pagos = lista;
          } else {
            this.pagos = [];
            this.error = 'La API devolvió un formato de pagos incorrecto.';
          }

          this.cargando = false;
          this.cdr.detectChanges();
        },

        error: (err: unknown) => {
          if (version !== this.versionCarga) return;

          this.cargando = false;

          if (err instanceof TimeoutError) {
            this.error = 'La consulta de pagos Yape superó los 30 segundos.';
          } else if (err instanceof HttpErrorResponse && err.status === 401) {
            this.error = 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
          } else if (err instanceof HttpErrorResponse && err.status === 403) {
            this.error = 'Tu usuario no tiene permiso para consultar los pagos.';
          } else if (err instanceof HttpErrorResponse && (err.status === 502 || err.status === 503)) {
            this.error = 'No se puede conectar con Spring Boot.';
          } else if (err instanceof HttpErrorResponse && err.status === 0) {
            this.error = 'No se pudo establecer conexión con la API.';
          } else {
            this.error = `No se pudieron cargar los pagos Yape (HTTP ${err instanceof HttpErrorResponse ? err.status : "desconocido"}).`;
          }

          this.cdr.detectChanges();
        }
      });

    this.cargaActual = consulta;
  }
  verAuditoria(idVenta: number): void {
    const version = ++this.versionAuditoria;

    this.auditoriaActual?.unsubscribe();

    if (this.auditoriaVenta === idVenta) {
      this.auditoriaVenta = null;
      this.eventos = [];
      this.cdr.detectChanges();
      return;
    }

    this.auditoriaVenta = idVenta;
    this.eventos = [];
    this.error = '';
    this.cdr.detectChanges();

    const consulta = this.service.auditoria(idVenta)
      .pipe(
        timeout(30000),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: eventos => {
          if (
            version !== this.versionAuditoria ||
            this.auditoriaVenta !== idVenta
          ) return;

          this.eventos = eventos ?? [];
          this.cdr.detectChanges();
        },

        error: () => {
          if (
            version !== this.versionAuditoria ||
            this.auditoriaVenta !== idVenta
          ) return;

          this.error = 'No se pudo cargar la auditoría del pago.';
          this.cdr.detectChanges();
        }
      });

    this.auditoriaActual = consulta;
  }
  aprobar(p: PagoYapeManual): void {
    if (p.estado !== 'PENDIENTE' || this.operando !== null) {
      return;
    }

    const confirmar = window.confirm(
      `Pedido #${p.idVenta}: ¿verificaste en tu cuenta Yape que recibiste exactamente S/ ${Number(p.importe).toFixed(2)}?`
    );

    if (!confirmar) return;

    this.operando = p.idVenta;
    this.error = '';
    this.mensaje = '';
    this.cdr.markForCheck();

    this.service.aprobar(p.idVenta).subscribe({
      next: () => {
        this.operando = null;
        this.mensaje = 'Pago aprobado correctamente y registrado en auditoría.';
        this.cdr.markForCheck();
        this.cargar();
      },

      error: (err: HttpErrorResponse) => {
        this.operando = null;
        this.error = `No se pudo aprobar el pago (HTTP ${err.status}). Consulta nuevamente su estado.`;
        this.cdr.markForCheck();
      }
    });
  }

  rechazar(p: PagoYapeManual): void {
    if (p.estado !== 'PENDIENTE' || this.operando !== null) {
      return;
    }

    const motivo = window.prompt(
      `Motivo de rechazo del pedido #${p.idVenta}:`
    );

    if (motivo === null) return;

    const limpio = motivo.trim();

    if (!limpio || limpio.length > 250) {
      this.error = 'Indica un motivo de hasta 250 caracteres.';
      this.cdr.markForCheck();
      return;
    }

    this.operando = p.idVenta;
    this.error = '';
    this.mensaje = '';
    this.cdr.markForCheck();

    this.service.rechazar(p.idVenta, limpio).subscribe({
      next: () => {
        this.operando = null;
        this.mensaje = 'Pago rechazado correctamente y registrado en auditoría.';
        this.cdr.markForCheck();
        this.cargar();
      },

      error: (err: HttpErrorResponse) => {
        this.operando = null;
        this.error = `No se pudo rechazar el pago (HTTP ${err.status}).`;
        this.cdr.markForCheck();
      }
    });
  }
}
