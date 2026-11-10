import {
  ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  YapeComprobanteInfo, YapeComprobantesService
} from '../../core/services/yape-comprobantes.service';

@Component({
  selector: 'app-yape-comprobante-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-4 border-t border-slate-200 pt-4">
      <button type="button" (click)="consultar()" [disabled]="cargando"
              class="rounded-lg border px-4 py-2 text-sm font-semibold">
        {{ cargando ? 'Consultando...' : abierto ? 'Actualizar comprobante' : 'Ver comprobante enviado' }}
      </button>
      @if (mensaje) {
        <p class="mt-2 text-sm text-slate-600">{{ mensaje }}</p>
      }
      @if (info) {
        <div class="mt-3 rounded-lg bg-slate-50 p-4">
          <p class="text-sm">Captura recibida: {{ info.enviadoEn | date:'medium' }}</p>
          @if (imagenUrl) {
            <img [src]="imagenUrl" alt="Captura de Yape enviada por el cliente"
                 class="mt-3 max-h-96 max-w-full rounded-lg border object-contain" />
          }
          <p class="mt-2 text-xs text-amber-800">
            Una captura no acredita que el dinero llegó. Verifica el abono en tu propia cuenta
            antes de utilizar «Aprobar pago verificado».
          </p>
        </div>
      }
    </div>
  `
})
export class YapeComprobanteAdminComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) idVenta!: number;

  private readonly servicio = inject(YapeComprobantesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private suscripciones = new Subscription();

  cargando = false;
  abierto = false;
  mensaje = '';
  info: YapeComprobanteInfo | null = null;
  imagenUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idVenta']) this.limpiar();
  }

  consultar(): void {
    if (this.cargando || this.idVenta <= 0) return;
    this.liberarImagen();
    this.abierto = true;
    this.cargando = true;
    this.info = null;
    this.mensaje = '';
    this.cdr.markForCheck();

    this.suscripciones.add(this.servicio.infoAdmin(this.idVenta).subscribe({
      next: info => {
        this.info = info;
        this.suscripciones.add(this.servicio.imagenAdmin(this.idVenta).subscribe({
          next: blob => {
            this.cargando = false;
            if (blob.size > 0 && ['image/png', 'image/jpeg'].includes(blob.type)) {
              this.imagenUrl = URL.createObjectURL(blob);
            } else {
              this.mensaje = 'El servidor no devolvió una imagen válida.';
            }
            this.cdr.markForCheck();
          },
          error: (err: HttpErrorResponse) => {
            this.cargando = false;
            this.mensaje = `No se pudo mostrar la imagen (HTTP ${err.status}).`;
            this.cdr.markForCheck();
          }
        }));
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.mensaje = err.status === 404
          ? 'Este pedido todavía no tiene una captura enviada.'
          : `No se pudo consultar el comprobante (HTTP ${err.status}).`;
        this.cdr.markForCheck();
      }
    }));
  }

  private liberarImagen(): void {
    if (this.imagenUrl) URL.revokeObjectURL(this.imagenUrl);
    this.imagenUrl = null;
  }

  private limpiar(): void {
    this.suscripciones.unsubscribe();
    this.suscripciones = new Subscription();
    this.liberarImagen();
    this.cargando = false;
    this.abierto = false;
    this.mensaje = '';
    this.info = null;
  }

  ngOnDestroy(): void { this.limpiar(); }
}
