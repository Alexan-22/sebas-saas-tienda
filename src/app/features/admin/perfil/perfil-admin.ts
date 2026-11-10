
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Perfil } from '../../../core/models/perfil';
import { PerfilService } from '../../../core/services/perfil.service';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-perfil-admin',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './perfil-admin.html',
  styleUrl: './perfil-admin.css'
})
export class PerfilAdmin implements OnInit {

  private readonly api = inject(PerfilService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  perfil: Perfil | null = null;

  nombre = '';
  apellido = '';

  contrasenaActual = '';
  contrasenaNueva = '';
  confirmarContrasena = '';

  cargando = false;
  guardando = false;
  cambiandoContrasena = false;

  error = '';
  mensaje = '';
  errorContrasena = '';
  mensajeContrasena = '';

  ngOnInit(): void {
    this.cargarPerfil();
  }

  get iniciales(): string {
    const nombre = this.perfil?.nombre?.charAt(0) ?? '';
    const apellido = this.perfil?.apellido?.charAt(0) ?? '';

    return (nombre + apellido).toUpperCase() || 'AD';
  }

  cargarPerfil(): void {
    this.cargando = true;
    this.error = '';

    this.api.obtener().subscribe({
      next: perfil => {
        this.perfil = perfil;
        this.nombre = perfil.nombre;
        this.apellido = perfil.apellido;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = this.obtenerError(
          err,
          'No se pudo cargar el perfil.'
        );
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardarPerfil(): void {
    if (this.guardando) return;

    const nombre = this.nombre.trim();
    const apellido = this.apellido.trim();

    this.error = '';
    this.mensaje = '';

    if (!nombre || !apellido) {
      this.error = 'Completa tu nombre y apellido.';
      return;
    }

    if (nombre.length > 100 || apellido.length > 100) {
      this.error = 'MÃ¡ximo 100 caracteres por campo.';
      return;
    }

    this.guardando = true;

    this.api.actualizar({ nombre, apellido }).subscribe({
      next: perfil => {
        this.perfil = perfil;
        this.nombre = perfil.nombre;
        this.apellido = perfil.apellido;
        this.guardando = false;
        this.mensaje = 'Tu perfil se actualizÃ³ correctamente.';
      },
      error: err => {
        this.guardando = false;
        this.error = this.obtenerError(
          err,
          'No se pudieron guardar los cambios.'
        );
      }
    });
  }

  cambiarContrasena(): void {
    if (this.cambiandoContrasena) return;

    this.errorContrasena = '';
    this.mensajeContrasena = '';

    if (
      !this.contrasenaActual ||
      !this.contrasenaNueva ||
      !this.confirmarContrasena
    ) {
      this.errorContrasena = 'Completa todos los campos.';
      return;
    }

    if (this.contrasenaNueva.length < 12) {
      this.errorContrasena =
        'La contraseÃ±a nueva necesita al menos 12 caracteres.';
      return;
    }

    if (this.contrasenaNueva !== this.confirmarContrasena) {
      this.errorContrasena = 'Las contraseÃ±as no coinciden.';
      return;
    }

    this.cambiandoContrasena = true;

    this.api.cambiarContrasena({
      contrasenaActual: this.contrasenaActual,
      contrasenaNueva: this.contrasenaNueva,
      confirmarContrasena: this.confirmarContrasena
    }).subscribe({
      next: () => {
        this.cambiandoContrasena = false;
        this.contrasenaActual = '';
        this.contrasenaNueva = '';
        this.confirmarContrasena = '';

        this.mensajeContrasena =
          'ContraseÃ±a actualizada. Vuelve a iniciar sesiÃ³n.';

        this.auth.logout();
        void this.router.navigate(['/login']);
      },
      error: err => {
        this.cambiandoContrasena = false;
        this.errorContrasena = this.obtenerError(
          err,
          'No se pudo cambiar la contraseÃ±a.'
        );
      }
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  private obtenerError(err: any, defecto: string): string {
    if (typeof err?.error === 'string' &&
        err.error.trim() &&
        !err.error.trim().startsWith('<')) {
      return err.error.slice(0, 300);
    }

    return err?.error?.detail ??
      err?.error?.message ??
      defecto;
  }
}

