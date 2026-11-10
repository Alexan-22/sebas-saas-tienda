import {
  ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  YapeComprobantesService, YapeComprobanteInfo
} from '../../core/services/yape-comprobantes.service';

@Component({
  selector: 'app-yape-comprobante-cliente',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 class="text-lg font-bold">Enviar comprobante de Yape</h2>
      <p class="mt-2 text-sm text-slate-600">
        La captura es una evidencia. No confirma el depósito ni cambia el estado del pedido.
        No pagues dos veces ni compartas claves o códigos de seguridad.
      </p>

      @if (cargando) {
        <p class="mt-4 text-sm">Consultando comprobante...</p>
      }

      @if (info) {
        <p class="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          Comprobante recibido el {{ info.enviadoEn | date:'medium' }}.
          El administrador todavía debe revisar el abono.
        </p>
      } @else if (estado === 'PENDIENTE' && !cargando) {
        <label class="mt-4 block text-sm font-semibold" for="yape-captura">
          Seleccionar captura (PNG o JPG, máximo 5 MB)
        </label>
        <input id="yape-captura" class="mt-2 block w-full text-sm" type="file"
               accept="image/png,image/jpeg" [disabled]="subiendo"
               (change)="seleccionar($event)" />
        @if (preview) {
          <img class="mt-3 max-h-72 max-w-full rounded-lg border object-contain"
               [src]="preview" alt="Vista previa local de la captura" />
        }
        <button type="button" (click)="enviar()" [disabled]="!archivo || subiendo"
                class="mt-3 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {{ subiendo ? 'Enviando comprobante...' : 'Enviar comprobante al comercio' }}
        </button>
      }

      @if (error) {
        <p role="alert" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      }

      @if (estado === 'PENDIENTE' && whatsappUrl) {
        <a class="mt-4 inline-block rounded-lg border border-green-600 px-4 py-3 text-sm font-semibold text-green-800"
           [href]="whatsappUrl" target="_blank" rel="noopener noreferrer">
          Avisar por WhatsApp
        </a>
        <p class="mt-1 text-xs text-slate-600">
          WhatsApp abre un mensaje preparado. Si deseas compartir la imagen por WhatsApp,
          tendrás que adjuntarla manualmente; no se envía automáticamente.
        </p>
      }
    </section>
  `
})
export class YapeComprobanteClienteComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) idVenta!: number;
  @Input() estado = 'PENDIENTE';

  private readonly servicio = inject(YapeComprobantesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private peticiones = new Subscription();

  archivo: File | null = null;
  preview: string | null = null;
  info: YapeComprobanteInfo | null = null;
  whatsappUrl: string | null = null;
  cargando = false;
  subiendo = false;
  error = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idVenta'] && Number.isInteger(this.idVenta) && this.idVenta > 0) {
      this.peticiones.unsubscribe();
      this.peticiones = new Subscription();
      this.liberarPreview();
      this.archivo = null;
      this.info = null;
      this.whatsappUrl = null;
      this.error = '';
      this.consultar();
    }
  }

  private consultar(): void {
    this.cargando = true;
    this.cdr.markForCheck();
    this.peticiones.add(this.servicio.infoCliente(this.idVenta).subscribe({
      next: info => {
        this.info = info;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        if (err.status !== 404) {
          this.error = `No se pudo consultar el comprobante (HTTP ${err.status}).`;
        }
        this.cdr.markForCheck();
      }
    }));
    if (this.estado === 'PENDIENTE') {
      this.peticiones.add(this.servicio.contacto(this.idVenta).subscribe({
        next: contacto => {
          this.whatsappUrl = contacto.url?.startsWith('https://wa.me/') ? contacto.url : null;
          this.cdr.markForCheck();
        },
        error: () => { this.whatsappUrl = null; this.cdr.markForCheck(); }
      }));
    }
  }

  seleccionar(evento: Event): void {
    this.liberarPreview();
    this.archivo = null;
    this.error = '';
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    if (!archivo) return;
    if (!['image/png', 'image/jpeg'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024 || archivo.size === 0) {
      this.error = 'Selecciona una imagen PNG o JPG de hasta 5 MB.';
      entrada.value = '';
      return;
    }
    this.archivo = archivo;
    this.preview = URL.createObjectURL(archivo);
    this.cdr.markForCheck();
  }

  enviar(): void {
    if (!this.archivo || this.subiendo || this.estado !== 'PENDIENTE' || this.info) return;
    this.subiendo = true;
    this.error = '';
    this.cdr.markForCheck();
    this.peticiones.add(this.servicio.subir(this.idVenta, this.archivo).subscribe({
      next: info => {
        this.info = info;
        this.archivo = null;
        this.liberarPreview();
        this.subiendo = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendo = false;
        this.error = err.status === 409
          ? 'Este pedido ya tiene comprobante o ya no está pendiente. Actualiza el pedido.'
          : `No se pudo enviar la captura (HTTP ${err.status}).`;
        this.cdr.markForCheck();
      }
    }));
  }

  private liberarPreview(): void {
    if (this.preview) URL.revokeObjectURL(this.preview);
    this.preview = null;
  }

  ngOnDestroy(): void {
    this.peticiones.unsubscribe();
    this.liberarPreview();
  }
}
