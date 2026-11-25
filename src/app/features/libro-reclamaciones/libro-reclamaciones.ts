import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TiendaService } from '../../core/services/tienda.service';

/** El envio real existe pero el interruptor queda OFF hasta aprobar las pruebas en staging. */
@Component({
  selector: 'app-libro-reclamaciones', standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <main class="libro">
      <a routerLink="/">← Volver a la tienda</a>
      <h1>Libro de Reclamaciones</h1>
      <p>{{ tienda.tiendaActual()?.nombre || 'Tienda' }}</p>
      @if (!registroHabilitado) {
        <div class="aviso" role="status"><strong>Registro temporalmente no disponible</strong>
          <p>Estamos verificando la identificación legal del proveedor y la entrega de constancias.
          No ingreses información personal todavía.</p></div>
      }
      @if (error()) { <p class="aviso" role="alert">{{ error() }}</p> }
      @if (numeroHoja() !== null) {
        <section class="confirmacion" role="status">
          <h2>Reclamación registrada: hoja N.º {{ numeroHoja() }}</h2>
          <p>Guarda la constancia en un lugar privado. El token es confidencial y permite acceder a tus datos.</p>
          <button type="button" (click)="descargarConstancia()" [disabled]="descargando()">{{ descargando() ? 'Preparando constancia…' : 'Descargar constancia HTML' }}</button>
          <p>Si sales de esta página, conserva el token para recuperar tu constancia.</p>
          <label>Token privado <input [value]="tokenConstancia()" readonly autocomplete="off" /></label>
        </section>
      }
      @if (registroHabilitado) {
        <section class="recuperacion">
          <h2>Recuperar una constancia anterior</h2>
          <label>Token privado <input [value]="tokenRecuperacion()" (input)="actualizarToken($event)" autocomplete="off" maxlength="43" /></label>
          <button type="button" (click)="descargarConstancia(tokenRecuperacion())" [disabled]="descargando() || tokenRecuperacion().length !== 43">Descargar constancia</button>
        </section>
      }
      <form [formGroup]="formulario" (ngSubmit)="enviar()" autocomplete="off">
        <fieldset [disabled]="!registroHabilitado">
          <legend>1. Datos del consumidor</legend>
          <label>Nombre completo <input formControlName="consumidorNombre" maxlength="200" required /></label>
          <label>Tipo de documento <select formControlName="documentoTipo"><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option><option value="OTRO">Otro</option></select></label>
          <label>Número de documento <input formControlName="documentoNumero" maxlength="30" required /></label>
          <label>Domicilio <textarea formControlName="domicilio" maxlength="2000" rows="2" required></textarea></label>
          <label>Correo <input type="email" formControlName="correo" maxlength="254" /></label>
          <label>Teléfono <input type="tel" formControlName="telefono" maxlength="30" /></label>
          <label class="check"><input type="checkbox" formControlName="menorEdad" /> Consumidor menor de edad</label>
          @if (formulario.controls.menorEdad.value) { <label>Nombre del representante <input formControlName="representanteNombre" maxlength="200" /></label> }
        </fieldset>
        <fieldset [disabled]="!registroHabilitado">
          <legend>2. Bien contratado</legend>
          <label>Tipo <select formControlName="bienTipo"><option value="PRODUCTO">Producto</option><option value="SERVICIO">Servicio</option></select></label>
          <label>Descripción <textarea formControlName="bienDescripcion" maxlength="4000" rows="3" required></textarea></label>
          <label>Monto reclamado (S/) <input type="number" min="0" step="0.01" formControlName="montoReclamado" /></label>
        </fieldset>
        <fieldset [disabled]="!registroHabilitado">
          <legend>3. Reclamo o queja</legend>
          <label>Tipo <select formControlName="tipo"><option value="RECLAMO">Reclamo</option><option value="QUEJA">Queja</option></select></label>
          <label>Detalle del problema <textarea formControlName="detalle" maxlength="12000" rows="5" required></textarea></label>
          <label>Pedido del consumidor <textarea formControlName="pedido" maxlength="12000" rows="4" required></textarea></label>
        </fieldset>
        <button type="submit" [disabled]="!registroHabilitado || formulario.invalid || enviando() || numeroHoja() !== null">{{ enviando() ? 'Registrando…' : 'Registrar reclamación' }}</button>
      </form>
    </main>`,
  styles: [`
    :host{display:block;background:#faf9f7;color:#222;min-height:100vh}.libro{max-width:780px;margin:auto;padding:30px 18px 90px;font:16px Arial,sans-serif}
    h1{font-size:clamp(27px,4vw,39px);margin:32px 0 5px}.aviso{background:#fff3da;border:1px solid #d7ae56;border-radius:9px;padding:16px;margin:24px 0}.aviso p{line-height:1.6}
    fieldset{border:1px solid #ddd;background:#fff;border-radius:12px;margin:18px 0;padding:20px;display:grid;gap:14px}fieldset:disabled{opacity:.65}
    legend{font-weight:700;padding:0 7px}label{display:grid;gap:6px;font-size:14px;font-weight:600}input,select,textarea{font:inherit;padding:10px;border:1px solid #aaa;border-radius:6px;min-width:0;max-width:100%;box-sizing:border-box}
    .check{display:flex;align-items:center;gap:8px}.confirmacion,.recuperacion{background:#fff;border:1px solid #ddd;border-radius:10px;padding:18px;margin:20px 0}.confirmacion input{width:100%}button{background:#242424;color:#fff;border:0;padding:12px 17px;border-radius:6px}button:disabled{opacity:.5;cursor:not-allowed}
  `]
})
export class LibroReclamaciones {
  readonly tienda = inject(TiendaService);
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/v1/reclamaciones`;
  private readonly fb = inject(FormBuilder);
  // Se mantendra false hasta que API, proveedor y constancia sean verificados.
  // NO cambiar a true hasta superar pruebas de autenticacion, RLS, HTTPS, proveedor y correo en staging.
  readonly registroHabilitado = false;
  readonly enviando = signal(false);
  readonly descargando = signal(false);
  readonly error = signal('');
  readonly numeroHoja = signal<number | null>(null);
  readonly tokenConstancia = signal('');
  readonly tokenRecuperacion = signal('');
  readonly formulario = this.fb.nonNullable.group({
    tipo: 'RECLAMO', consumidorNombre: ['', [Validators.required, Validators.maxLength(200)]],
    documentoTipo: 'DNI', documentoNumero: ['', Validators.required], domicilio: ['', Validators.required],
    correo: ['', Validators.email], telefono: '', menorEdad: false, representanteNombre: '',
    bienTipo: 'PRODUCTO', bienDescripcion: ['', Validators.required], montoReclamado: null as number | null,
    detalle: ['', Validators.required], pedido: ['', Validators.required]
  });
  enviar(): void {
    if (!this.registroHabilitado || this.formulario.invalid || this.enviando() || this.numeroHoja() !== null) return;
    this.error.set('');
    this.enviando.set(true);
    this.http.post<{numeroHoja: number; tokenConstancia: string}>(`${this.api}/registro`, this.formulario.getRawValue()).subscribe({
      next: respuesta => {
        this.enviando.set(false);
        if (!Number.isSafeInteger(respuesta?.numeroHoja) || !/^[A-Za-z0-9_-]{43}$/.test(respuesta?.tokenConstancia ?? '')) {
          this.error.set('No se pudo verificar el comprobante. Contacta a la tienda antes de volver a enviar.');
          return;
        }
        this.numeroHoja.set(respuesta.numeroHoja);
        this.tokenConstancia.set(respuesta.tokenConstancia);
        this.formulario.disable();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(err.status === 404 || err.status === 503
          ? 'El Libro de Reclamaciones no está disponible temporalmente. No se confirmó ningún registro.'
          : err.status === 429 ? 'Se excedió el límite de intentos. Intenta más tarde.'
          : 'No pudimos confirmar la recepción. Antes de volver a enviar, consulta con la tienda para evitar duplicados.');
      }
    });
  }

  actualizarToken(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.tokenRecuperacion.set(target.value.trim());
  }

  descargarConstancia(token: string = this.tokenConstancia()): void {
    if (!this.registroHabilitado || this.descargando() || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
    this.descargando.set(true);
    this.error.set('');
    this.http.post(`${this.api}/constancia`, {token}, {responseType:'text'}).subscribe({
      next: html => {
        this.descargando.set(false);
        // Descarga como archivo; no inserta HTML del servidor en el DOM de la tienda.
        const blob = new Blob([html], {type:'text/html;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `constancia-reclamacion-${this.numeroHoja() ?? 'privada'}.html`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.descargando.set(false);
        this.error.set('No se pudo recuperar la constancia. Comprueba el token y vuelve a intentar.');
      }
    });
  }
}
