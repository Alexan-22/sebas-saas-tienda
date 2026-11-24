import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TiendaService } from '../../core/services/tienda.service';

/** Vista previa segura. No envia datos personales mientras la API no esta habilitada. */
@Component({
  selector: 'app-libro-reclamaciones',
  standalone: true,
  imports: [RouterLink],
  template: `
  <main class="reclamaciones-page">
    <a routerLink="/" class="volver">← Volver a la tienda</a>
    <h1>Libro de Reclamaciones</h1>
    <p class="tienda">{{ tienda.tiendaActual()?.nombre || 'Mi tienda' }}</p>
    <div class="aviso" role="status">
      <strong>Vista previa — registro no habilitado</strong>
      <p>El formulario de registro se habilitará cuando la tienda tenga un mecanismo de recepción y entrega de constancias verificado. No ingreses datos personales aquí.</p>
    </div>
    <div class="grupo">
      <h2>Datos del consumidor</h2>
      <p>Nombre, documento de identidad, domicilio y medio de contacto. Datos del representante cuando corresponda.</p>
    </div>
    <div class="grupo">
      <h2>Producto o servicio</h2>
      <p>Descripción del bien contratado y monto reclamado cuando corresponda.</p>
    </div>
    <div class="grupo">
      <h2>Reclamo o queja</h2>
      <p>Descripción del problema y pedido concreto del consumidor.</p>
    </div>
    <p class="nota">Esta pantalla no registra, no transmite y no almacena reclamaciones.</p>
  </main>`,
  styles: [`
    :host{display:block;background:#faf9f7;min-height:100vh;color:#242424}
    .reclamaciones-page{max-width:760px;margin:0 auto;padding:32px 20px 80px;font-family:Arial,sans-serif}
    .volver{color:inherit;text-decoration:underline;font-size:14px}
    h1{font-size:clamp(27px,4vw,40px);margin:36px 0 8px}
    .tienda{font-size:17px;color:#555;margin-bottom:26px}
    .aviso{background:#fff4dd;border:1px solid #e9c879;border-radius:10px;padding:20px}
    .aviso p{line-height:1.55;margin-bottom:0}
    .grupo{background:white;border:1px solid #dedbd5;border-radius:12px;padding:18px 22px;margin-top:17px}
    h2{font-size:18px;margin:0 0 8px}
    .grupo p,.nota{line-height:1.6;color:#555}
  `]
})
export class LibroReclamaciones {
  readonly tienda = inject(TiendaService);
}
