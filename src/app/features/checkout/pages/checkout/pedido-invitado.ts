import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompraInvitadoResponse } from '../../../../core/services/checkout-invitado-api.service';

@Component({
  selector: 'app-pedido-invitado',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="mx-auto max-w-xl px-6 py-12">
      @if (respuesta) {
        <h1 class="text-2xl font-bold">Pedido #{{ respuesta.compra.idVenta }} registrado</h1>
        <p class="mt-3">Pago {{ respuesta.compra.medioPago }} pendiente de verificaciÃ³n.</p>
        <p class="mt-2">Total informado por la tienda: S/ {{ respuesta.compra.total }}</p>
        <p class="mt-4">Conserva tu identificador y el cÃ³digo privado. No compartas el cÃ³digo.</p>
        <label class="mt-3 block font-semibold" for="codigo">CÃ³digo privado del pedido</label>
        <input id="codigo" class="w-full border p-2" readonly [value]="respuesta.tokenAcceso" />
        <p class="mt-4">Las instrucciones y comprobantes de pago para invitados estarÃ¡n disponibles cuando el backend quede validado.</p>
      } @else {
        <h1 class="text-2xl font-bold">No hay un pedido en esta sesiÃ³n</h1>
        <p>Por seguridad, esta pÃ¡gina no recupera informaciÃ³n del pedido a partir del nÃºmero solamente.</p>
      }
      <a class="mt-6 block underline" routerLink="/">Volver a la tienda</a>
    </main>
  `
})
export class PedidoInvitado {
  readonly respuesta: CompraInvitadoResponse | null =
    (history.state?.respuestaInvitada as CompraInvitadoResponse | undefined) ?? null;
}