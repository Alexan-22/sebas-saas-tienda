
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Perfil } from '../../core/models/perfil';
import { PerfilService } from '../../core/services/perfil.service';
import { AuthService } from '../../core/services/auth';

import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-mi-cuenta',
  standalone: true,
  imports: [FormsModule, RouterLink, Navbar, Footer],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css'
})
export class MiCuenta implements OnInit {

  private readonly api = inject(PerfilService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  perfil: Perfil | null = null;

  nombre = '';
  apellido = '';

  contrasenaActual = '';
  contrasenaNueva = '';
  confirmarContrasena = '';

  cargando = true;
  guardando = false;
  cambiando = false;

  error = '';
  mensaje = '';
  errorContrasena = '';
  mensajeContrasena = '';

  ngOnInit(): void {
    this.cargarPerfil();
  }

  get iniciales(): string {
    return (
      (this.perfil?.nombre?.charAt(0) ?? '') +
      (this.perfil?.apellido?.charAt(0) ?? '')
    ).toUpperCase() || 'CL';
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
      },
      error: error => {
        this.error = this.mensajeError(
          error,
          'No se pudo cargar tu cuenta.'
        );
        this.cargando = false;
      }
    });
  }

  guardar(): void {
    if (this.guardando) return;

    const nombre = this.nombre.trim();
    const apellido = this.apellido.trim();

    this.error = '';
    this.mensaje = '';

    if (!nombre || !apellido) {
      this.error = 'Ingresa tu nombre y apellido.';
      return;
    }

    if (nombre.length > 100 || apellido.length > 100) {
      this.error = 'Máximo 100 caracteres por campo.';
      return;
    }

    this.guardando = true;

    this.api.actualizar({ nombre, apellido }).subscribe({
      next: perfil => {
        this.perfil = perfil;
        this.nombre = perfil.nombre;
        this.apellido = perfil.apellido;
        this.guardando = false;
        this.mensaje = 'Tus datos fueron actualizados.';
      },
      error: err => {
        this.guardando = false;
        this.error = this.mensajeError(
          err,
          'No se pudieron guardar tus datos.'
        );
      }
    });
  }

  cambiarContrasena(): void {
    if (this.cambiando) return;

    this.errorContrasena = '';
    this.mensajeContrasena = '';

    if (
      !this.contrasenaActual ||
      !this.contrasenaNueva ||
      !this.confirmarContrasena
    ) {
      this.errorContrasena = 'Completa los tres campos.';
      return;
    }

    if (this.contrasenaNueva.length < 12) {
      this.errorContrasena =
        'Utiliza una contraseña de al menos 12 caracteres.';
      return;
    }

    if (this.contrasenaNueva !== this.confirmarContrasena) {
      this.errorContrasena = 'Las contraseñas no coinciden.';
      return;
    }

    this.cambiando = true;

    this.api.cambiarContrasena({
      contrasenaActual: this.contrasenaActual,
      contrasenaNueva: this.contrasenaNueva,
      confirmarContrasena: this.confirmarContrasena
    }).subscribe({
      next: () => {
        this.cambiando = false;
        this.contrasenaActual = '';
        this.contrasenaNueva = '';
        this.confirmarContrasena = '';
        this.auth.logout();
        void this.router.navigate(['/login']);
      },
      error: err => {
        this.cambiando = false;
        this.errorContrasena = this.mensajeError(
          err,
          'No se pudo cambiar la contraseña.'
        );
      }
    });
  }

  salir(): void {
    this.auth.logout();
    void this.router.navigate(['/']);
  }

  private mensajeError(error: any, defecto: string): string {
    if (typeof error?.error === 'string' &&
        error.error.trim() &&
        !error.error.trim().startsWith('<')) {
      return error.error.slice(0, 300);
    }

    return error?.error?.detail ??
      error?.error?.message ??
      defecto;
  }
}
