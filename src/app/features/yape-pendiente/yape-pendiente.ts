
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { YapeComprobanteClienteComponent } from '../yape-comprobante/yape-comprobante-cliente';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

import {
  PagoYapeManual,
  YapePagosService
} from '../../core/services/yape-pagos.service';

@Component({
  selector: 'app-yape-pendiente',
  standalone: true,
  imports: [CommonModule, RouterLink, YapeComprobanteClienteComponent],
  templateUrl: './yape-pendiente.html'
})
export class YapePendiente implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(YapePagosService);
  private readonly cdr = inject(ChangeDetectorRef);

  private subscriptions = new Subscription();

  pago: PagoYapeManual | null = null;

  qrObjectUrl: string | null = null;

  cargando = true;
  cargandoQr = false;

  error = '';

  ngOnInit(): void {
    this.recargar();
  }

  recargar(): void {

    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    this.liberarQr();

    const id = Number(
      this.route.snapshot.paramMap.get('idVenta')
    );

    this.pago = null;
    this.error = '';

    if (!Number.isInteger(id) || id <= 0) {
      this.error = 'Número de pedido inválido.';
      this.cargando = false;
      this.cdr.markForCheck();
      return;
    }

    this.cargando = true;
    this.cargandoQr = false;
    this.cdr.markForCheck();

    const consulta = this.service.mio(id).subscribe({

      next: pago => {

        this.pago = pago;
        this.cargando = false;

        this.cdr.markForCheck();

        if (pago.estado === 'PENDIENTE') {
          this.cargarQr(id);
        }
      },

      error: (err: HttpErrorResponse) => {

        this.cargando = false;
        this.pago = null;

        if (err.status === 401) {
          this.error = 'Inicia sesión para consultar tu pedido.';
        } else if (err.status === 403) {
          this.error = 'No tienes permiso para consultar este pedido.';
        } else if (err.status === 502 || err.status === 503) {
          this.error = 'El servidor está temporalmente desconectado.';
        } else {
          this.error = `No se pudo consultar el pedido Yape (HTTP ${err.status}).`;
        }

        this.cdr.markForCheck();
      }
    });

    this.subscriptions.add(consulta);
  }

  private cargarQr(idVenta: number): void {

    this.cargandoQr = true;
    this.cdr.markForCheck();

    const consulta = this.service.qrMio(idVenta).subscribe({

      next: blob => {

        this.cargandoQr = false;

        if (
          blob.size > 0 &&
          (blob.type === 'image/png' || blob.type === 'image/jpeg')
        ) {
          this.liberarQr();
          this.qrObjectUrl = URL.createObjectURL(blob);
        } else {
          this.error =
            'El servidor no devolvió una imagen QR válida. ' +
            `Tipo recibido: ${blob.type || 'desconocido'}.`;
        }

        this.cdr.markForCheck();
      },

      error: (err: HttpErrorResponse) => {

        this.cargandoQr = false;

        if (err.status === 404) {
          this.error = 'La tienda todavía no tiene un QR disponible para este pedido.';
        } else if (err.status === 401 || err.status === 403) {
          this.error = 'No tienes autorización para consultar este QR.';
        } else {
          this.error = `No se pudo cargar el QR Yape (HTTP ${err.status}).`;
        }

        this.cdr.markForCheck();
      }
    });

    this.subscriptions.add(consulta);
  }

  private liberarQr(): void {

    if (this.qrObjectUrl) {
      URL.revokeObjectURL(this.qrObjectUrl);
    }

    this.qrObjectUrl = null;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.liberarQr();
  }
}
