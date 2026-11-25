import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TiendaService } from '../../core/services/tienda.service';

/** Formulario completo, retenido en modo seguro hasta habilitar entrega legal y backend. */
@Component({
  selector: 'app-libro-reclamaciones', standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <main class="libro">
      <a routerLink="/">← Volver a la tienda</a>
      <h1>Libro de Reclamaciones</h1>
      <p>{{ tienda.tiendaActual()?.nombre || 'Tienda' }}</p>
      <div class="aviso" role="status"><strong>Registro temporalmente no disponible</strong>
        <p>Estamos verificando la identificación legal del proveedor y la entrega de constancias.
        El formulario no envía ni guarda datos. No ingreses información personal todavía.</p></div>
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
        <button type="submit" [disabled]="!registroHabilitado || formulario.invalid || enviando()">Registrar reclamación</button>
      </form>
    </main>`,
  styles: [`
    :host{display:block;background:#faf9f7;color:#222;min-height:100vh}.libro{max-width:780px;margin:auto;padding:30px 18px 90px;font:16px Arial,sans-serif}
    h1{font-size:clamp(27px,4vw,39px);margin:32px 0 5px}.aviso{background:#fff3da;border:1px solid #d7ae56;border-radius:9px;padding:16px;margin:24px 0}.aviso p{line-height:1.6}
    fieldset{border:1px solid #ddd;background:#fff;border-radius:12px;margin:18px 0;padding:20px;display:grid;gap:14px}fieldset:disabled{opacity:.65}
    legend{font-weight:700;padding:0 7px}label{display:grid;gap:6px;font-size:14px;font-weight:600}input,select,textarea{font:inherit;padding:10px;border:1px solid #aaa;border-radius:6px;min-width:0;max-width:100%;box-sizing:border-box}
    .check{display:flex;align-items:center;gap:8px}button{background:#242424;color:#fff;border:0;padding:12px 17px;border-radius:6px}button:disabled{opacity:.5;cursor:not-allowed}
  `]
})
export class LibroReclamaciones {
  readonly tienda = inject(TiendaService);
  private readonly fb = inject(FormBuilder);
  // Se mantendra false hasta que API, proveedor y constancia sean verificados.
  readonly registroHabilitado = false;
  readonly enviando = signal(false);
  readonly formulario = this.fb.nonNullable.group({
    tipo: 'RECLAMO', consumidorNombre: ['', [Validators.required, Validators.maxLength(200)]],
    documentoTipo: 'DNI', documentoNumero: ['', Validators.required], domicilio: ['', Validators.required],
    correo: ['', Validators.email], telefono: '', menorEdad: false, representanteNombre: '',
    bienTipo: 'PRODUCTO', bienDescripcion: ['', Validators.required], montoReclamado: null as number | null,
    detalle: ['', Validators.required], pedido: ['', Validators.required]
  });
  enviar(): void { /* Intencionalmente sin petición HTTP: falla cerrado. */ }
}
