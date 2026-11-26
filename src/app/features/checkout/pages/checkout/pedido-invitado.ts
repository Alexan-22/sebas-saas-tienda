import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CheckoutInvitadoApiService, CompraInvitadoResponse } from '../../../../core/services/checkout-invitado-api.service';
import { YapeService } from '../../../../core/services/yape.service';
import { TransferenciasService, CuentaBancaria } from '../../../../core/services/transferencias.service';

@Component({
  selector: 'app-pedido-invitado',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-12">
      <section class="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm border border-slate-200 sm:p-10">
        @if (respuesta) {
          <div class="mb-5 text-sm font-semibold text-emerald-700">Pedido recibido</div>
          <h1 class="text-3xl font-black text-slate-900">Pedido #{{ respuesta.compra.idVenta }}</h1>
          <p class="mt-3 text-slate-700">Tu pedido se registró. <strong>El pago todavía no está confirmado.</strong></p>
          <div class="mt-6 rounded-xl bg-slate-50 p-5">
            <div class="flex justify-between gap-4"><span>Método</span><strong>{{ respuesta.compra.medioPago }}</strong></div>
            <div class="mt-3 flex justify-between gap-4"><span>Total del servidor</span><strong>S/ {{ respuesta.compra.total }}</strong></div>
          </div>
          @if (respuesta.compra.medioPago === 'YAPE') {
            <div class="mt-6 rounded-xl border border-slate-200 p-5">
              <h2 class="text-lg font-bold">Pagar por Yape</h2>
              @if (numeroYape) {
                <p class="mt-2">Número Yape del comercio: <strong>{{ numeroYape }}</strong></p>
                <p class="mt-2 text-sm">Realiza el pago del total exacto y conserva tu comprobante.</p>
              } @else {
                <p class="mt-2 text-amber-800">No se pudieron cargar los datos de Yape. Contacta con la tienda antes de pagar.</p>
              }
            </div>
          } @else if (respuesta.compra.medioPago === 'TRANSFERENCIA') {
            <div class="mt-6 rounded-xl border border-slate-200 p-5">
              <h2 class="text-lg font-bold">Transferencia bancaria</h2>
              @if (cuentas.length) {
                @for (cuenta of cuentas; track cuenta.id) {
                  <p class="mt-3 text-sm"><strong>{{ cuenta.banco }}</strong> · {{ cuenta.titular }}<br />
                    Cuenta: {{ cuenta.numeroCuenta }} · {{ cuenta.moneda }}</p>
                }
                <p class="mt-3 text-sm">Transfiere el importe exacto a la cuenta que elegiste al comprar. Conserva el comprobante.</p>
              } @else {
                <p class="mt-2 text-amber-800">No se pudieron cargar las cuentas. Contacta con la tienda antes de transferir.</p>
              }
            </div>
          }
          <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Tu pago permanecerá pendiente hasta que el comercio lo verifique. Si ya pagaste, no vuelvas a realizar el pago.
          </div>
          <div class="mt-6">
            <label class="text-sm font-bold" for="codigo">Código privado de consulta (no lo compartas)</label>
            <input id="codigo" class="mt-2 w-full rounded-lg border border-slate-300 p-3 text-xs" readonly [value]="respuesta.tokenAcceso" />
            <p class="mt-2 text-xs text-slate-600">Guarda el número de pedido y este código. La información se conserva solo en esta pestaña; evita equipos públicos.</p>
          </div>
        } @else {
          <h1 class="text-2xl font-bold">No hay un pedido en esta sesión</h1>
          <p class="mt-3">Por seguridad, no se recupera un pedido a partir del número solamente.</p>
        }
        <a routerLink="/" class="mt-8 inline-block font-semibold text-indigo-700 underline">Volver a la tienda</a>
      </section>
    </main>
  `
})
export class PedidoInvitado {
  private readonly yapeService = inject(YapeService);
  private readonly transferencias = inject(TransferenciasService);
  // El token nunca se pone en la URL. Se conserva en sessionStorage de esta pestaña.
  readonly respuesta: CompraInvitadoResponse | null = this.obtenerRespuesta();
  numeroYape = '';
  cuentas: CuentaBancaria[] = [];

  constructor() {
    if (this.respuesta?.compra.medioPago === 'YAPE') {
      this.yapeService.publico().subscribe({
        next: config => { if (config.habilitado) this.numeroYape = config.numeroYape ?? ''; },
        error: () => { this.numeroYape = ''; }
      });
    }
    if (this.respuesta?.compra.medioPago === 'TRANSFERENCIA') {
      this.transferencias.cuentasPublicas().subscribe({
        next: cuentas => { this.cuentas = cuentas; },
        error: () => { this.cuentas = []; }
      });
    }
  }

  private obtenerRespuesta(): CompraInvitadoResponse | null {
    const estado = history.state?.respuestaInvitada as CompraInvitadoResponse | undefined;
    if (estado?.compra?.idVenta && estado.tokenAcceso) return estado;
    try {
      const guardado = sessionStorage.getItem(`pedido-invitado:${window.location.hostname}`);
      if (!guardado) return null;
      const parseado = JSON.parse(guardado) as CompraInvitadoResponse;
      return parseado?.compra?.idVenta && parseado?.tokenAcceso ? parseado : null;
    } catch { return null; }
  }
}
