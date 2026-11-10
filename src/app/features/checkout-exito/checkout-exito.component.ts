import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-exito',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">✓</div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">¡Pago Exitoso!</h1>
        <p class="text-gray-600 mb-6">Tu compra en Sebas Collection se ha procesado correctamente. Gracias por confiar en nosotros.</p>
        <a routerLink="/" class="block w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition">Volver al Inicio</a>
      </div>
    </div>
  `
})
export class CheckoutExitoComponent {}