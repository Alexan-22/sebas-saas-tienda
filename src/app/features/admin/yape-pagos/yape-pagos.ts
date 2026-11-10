
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { YapeComprobanteAdminComponent } from '../../yape-comprobante/yape-comprobante-admin';
import { HttpErrorResponse } from '@angular/common/http';

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
    if (this.cargando) return;

    this.cargando = true;
    this.error = '';
    this.cdr.markForCheck();

    this.service.listarAdmin().subscribe({
      next: lista => {

        if (Array.isArray(lista)) {
          this.pagos = lista;
        } else {
          this.pagos = [];
          this.error = 'La API devolvió un formato de pagos incorrecto.';
        }

        this.cargando = false;
        this.cdr.markForCheck();
      },

      error: (err: HttpErrorResponse) => {
        console.error('Error consultando pagos Yape:', err.status);

        this.cargando = false;

        if (err.status === 401) {
          this.error = 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
        } else if (err.status === 403) {
          this.error = 'Tu usuario no tiene permiso para consultar los pagos.';
        } else if (err.status === 502 || err.status === 503) {
          this.error = 'No se puede conectar con Spring Boot. Revisa la sesión aislada.';
        } else if (err.status === 0) {
          this.error = 'No se pudo establecer conexión con la API.';
        } else {
          this.error = `No se pudieron cargar los pagos Yape (HTTP ${err.status}).`;
        }

        this.cdr.markForCheck();
      }
    });
  }

  verAuditoria(idVenta: number): void {
    if (this.auditoriaVenta === idVenta) {
      this.auditoriaVenta = null;
      this.eventos = [];
      this.cdr.markForCheck();
      return;
    }

    this.auditoriaVenta = idVenta;
    this.eventos = [];
    this.error = '';

    this.service.auditoria(idVenta).subscribe({
      next: eventos => {
        this.eventos = eventos;
        this.cdr.markForCheck();
      },

      error: () => {
        this.error = 'No se pudo cargar la auditoría del pago.';
        this.cdr.markForCheck();
      }
    });
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
