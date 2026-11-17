
import {
  Component,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  PagoTransferencia,
  TransferenciasService
} from '../../core/services/transferencias.service';

@Component({
  selector: 'app-transferencia-pendiente',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './transferencia-pendiente.html',
  styleUrl: './transferencia-pendiente.css'
})
export class TransferenciaPendiente implements OnInit, OnDestroy {

  private readonly ruta = inject(ActivatedRoute);
  private readonly api = inject(TransferenciasService);
  private readonly cdr = inject(ChangeDetectorRef);

  private subs = new Subscription();

  pago: PagoTransferencia | null = null;

  cargando = true;
  error = '';
  mensaje = '';

  imagenGuardada: string | null = null;

  reemplazando = false;
  motivoReemplazo = '';

  archivo: File | null = null;
  preview: string | null = null;

  infoEnviada = false;
  subiendo = false;

  whatsappUrl: string | null = null;

  ngOnInit(): void {
    this.recargar();
  }

  recargar(): void {
    this.subs.unsubscribe();
    this.subs = new Subscription();

    this.liberarGuardada();
    this.liberarPreview();

    this.reemplazando = false;
    this.motivoReemplazo = '';
    this.archivo = null;
    this.mensaje = '';

    const id = Number(
      this.ruta.snapshot.paramMap.get('idVenta')
    );

    if (!Number.isInteger(id) || id <= 0) {
      this.pago = null;
      this.cargando = false;
      this.error = 'Pedido inválido';
      this.infoEnviada = false;
      this.whatsappUrl = null;
      this.cdr.markForCheck();
      return;
    }

    this.pago = null;
    this.cargando = true;
    this.error = '';
    this.infoEnviada = false;
    this.whatsappUrl = null;

    this.cdr.markForCheck();

    this.subs.add(
      this.api.miPago(id).subscribe({
        next: (p) => {
          this.pago = p;
          this.cargando = false;
          this.cdr.markForCheck();

          this.consultarComprobante(id);
        },
        error: (e) => {
          this.cargando = false;
          this.error =
            `No se pudo consultar el pedido (HTTP ${e.status}).`;
          this.cdr.markForCheck();
        }
      })
    );
  }

  private consultarComprobante(id: number): void {

    this.subs.add(
      this.api.misDatosComprobante(id).subscribe({
        next: () => {
          this.infoEnviada = true;
          this.cdr.markForCheck();
        },
        error: (e) => {
          if (e.status !== 404) {
            this.error =
              `No se pudo consultar el comprobante (HTTP ${e.status}).`;
          }
          this.cdr.markForCheck();
        }
      })
    );

    this.subs.add(
      this.api.contacto(id).subscribe({
        next: (c) => {
          this.whatsappUrl =
            c.url?.startsWith('https://wa.me/')
              ? c.url
              : null;

          this.cdr.markForCheck();
        },
        error: () => {
          this.whatsappUrl = null;
          this.cdr.markForCheck();
        }
      })
    );
  }

  seleccionar(event: Event): void {

    this.liberarPreview();
    this.archivo = null;
    this.error = '';

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (
      file.size <= 0 ||
      file.size > 5 * 1024 * 1024 ||
      !['image/png', 'image/jpeg'].includes(file.type)
    ) {
      this.error =
        'Selecciona una imagen PNG o JPG de hasta 5 MB.';

      input.value = '';
      this.cdr.markForCheck();
      return;
    }

    this.archivo = file;
    this.preview = URL.createObjectURL(file);

    this.cdr.markForCheck();
  }

  subir(): void {

    if (
      !this.pago ||
      this.pago.estado !== 'PENDIENTE' ||
      !this.archivo ||
      this.subiendo ||
      (this.infoEnviada && !this.reemplazando)
    ) {
      return;
    }

    this.subiendo = true;
    this.error = '';

    this.cdr.markForCheck();

    const envio = this.reemplazando
      ? this.api.reemplazarComprobante(
          this.pago.idVenta,
          this.archivo,
          this.motivoReemplazo
        )
      : this.api.enviarComprobante(
          this.pago.idVenta,
          this.archivo
        );

    this.subs.add(
      envio.subscribe({
        next: () => {
          this.reemplazando = false;
          this.motivoReemplazo = '';

          this.liberarGuardada();

          this.infoEnviada = true;
          this.subiendo = false;
          this.archivo = null;

          this.liberarPreview();

          this.mensaje = 'Comprobante enviado correctamente.';
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.subiendo = false;
          this.error =
            `No se pudo enviar el comprobante (HTTP ${e.status}).`;
          this.cdr.markForCheck();
        }
      })
    );
  }

  pedirReemplazo(): void {

    const motivo = window.prompt(
      'Motivo del reemplazo (máximo 100 caracteres). La imagen anterior se conservará.'
    )?.trim();

    if (!motivo || motivo.length > 100) {
      return;
    }

    this.motivoReemplazo = motivo;
    this.reemplazando = true;

    this.cdr.markForCheck();
  }

  verImagen(): void {

    if (!this.pago) {
      return;
    }

    this.subs.add(
      this.api.imagenMia(this.pago.idVenta).subscribe({
        next: (blob) => {
          this.liberarGuardada();

          this.imagenGuardada =
            URL.createObjectURL(blob);

          this.cdr.markForCheck();
        },
        error: (e) => {
          this.error =
            `No se pudo cargar la imagen privada (HTTP ${e.status}).`;
          this.cdr.markForCheck();
        }
      })
    );
  }

  async copiar(texto: string): Promise<void> {

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const input = document.createElement('textarea');
        input.value = texto;

        document.body.appendChild(input);
        input.select();

        const ok = document.execCommand('copy');
        input.remove();

        if (!ok) {
          throw new Error('No se pudo copiar');
        }
      }

      this.mensaje = 'Copiado';
    } catch {
      this.mensaje =
        'No se pudo copiar automáticamente. Selecciona y copia el número visible.';
    }

    this.cdr.markForCheck();
  }

  private liberarGuardada(): void {
    if (this.imagenGuardada) {
      URL.revokeObjectURL(this.imagenGuardada);
    }

    this.imagenGuardada = null;
  }

  private liberarPreview(): void {
    if (this.preview) {
      URL.revokeObjectURL(this.preview);
    }

    this.preview = null;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.liberarGuardada();
    this.liberarPreview();
  }
}
