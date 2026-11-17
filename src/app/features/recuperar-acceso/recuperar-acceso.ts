import { Component, DestroyRef, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-recuperar-acceso',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: ` <main class="mx-auto max-w-lg p-6">
    <h1 class="text-2xl font-bold">
      {{ restablecer ? 'Restablecer contraseña' : 'Recuperar acceso' }}
    </h1>
    <p>
      La recuperación depende del correo de la cuenta y de esta tienda o ámbito. Nunca compartas el
      enlace recibido.
    </p>
    <form (ngSubmit)="enviar()" class="grid gap-4 mt-6">
      @if (!restablecer) {
        <label
          >Correo<input
            class="block border rounded p-2 w-full"
            type="email"
            name="correo"
            [(ngModel)]="correo"
            autocomplete="email"
            maxlength="150"
            required
        /></label>
      } @else {
        <label
          >Nueva contraseña<input
            class="block border rounded p-2 w-full"
            type="password"
            name="password"
            [(ngModel)]="password"
            autocomplete="new-password"
            minlength="12"
            maxlength="72"
            required
        /></label>
        <p>Al menos 12 caracteres y un máximo de 72 bytes UTF-8.</p>
      }
      <button
        type="submit"
        class="rounded bg-violet-700 text-white p-3"
        [disabled]="cargando || finalizado"
      >
        {{
          cargando
            ? 'Procesando...'
            : restablecer
              ? 'Guardar contraseña'
              : 'Solicitar instrucciones'
        }}
      </button>
    </form>
    @if (mensaje) {
      <p role="status">{{ mensaje }}</p>
    }
    @if (error) {
      <p role="alert">{{ error }}</p>
    }
    <a [routerLink]="rutaLogin">Volver al acceso</a>
  </main>`,
})
export class RecuperarAcceso implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token') ?? '';
  readonly restablecer = !!this.token;
  private readonly base = environment.apiUrl + '/api/auth/password';
  readonly rutaLogin = '/login';
  finalizado = false;
  correo = '';
  password = '';
  cargando = false;
  mensaje = '';
  error = '';
  constructor() {
    if (this.token)
      void this.router.navigate([], {
        relativeTo: this.route,
        fragment: '',
        replaceUrl: true,
        queryParamsHandling: 'preserve',
      });
  }
  ngOnDestroy() {
    this.token = '';
    this.password = '';
  }
  enviar(): void {
    if (this.cargando || this.finalizado) return;
    this.error = '';
    this.mensaje = '';
    if (
      this.restablecer &&
      (this.password.length < 12 || new TextEncoder().encode(this.password).length > 72)
    ) {
      this.error = 'Revisa la longitud de la nueva contraseña.';
      return;
    }
    if (!this.restablecer && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo)) {
      this.error = 'Ingresa un correo válido.';
      return;
    }
    this.cargando = true;
    const body = this.restablecer
      ? { token: this.token, passwordNueva: this.password }
      : { correo: this.correo.trim() };
    this.http
      .post(this.base + (this.restablecer ? '/reset' : '/forgot'), body)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.cargando = false;
          this.password = '';
          this.correo = '';
          this.mensaje = this.restablecer
            ? 'Contraseña actualizada. Inicia sesión nuevamente.'
            : 'Si la cuenta cumple los requisitos, recibirás instrucciones.';
          if (this.restablecer) {
            this.finalizado = true;
            this.token = '';
            this.auth.logout();
          }
          this.cdr.markForCheck();
        },
        error: (e: HttpErrorResponse) => {
          this.cargando = false;
          this.password = '';
          this.error =
            e.status === 503
              ? 'Recuperación temporalmente no disponible. Intenta más tarde.'
              : e.status === 429
                ? 'Demasiados intentos. Intenta más tarde.'
                : 'No se pudo completar la solicitud. El enlace puede haber vencido.';
          this.cdr.markForCheck();
        },
      });
  }
}
