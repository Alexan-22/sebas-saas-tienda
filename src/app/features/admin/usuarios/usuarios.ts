import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioAdmin } from '../../../core/models/usuario-admin';
import { UsuarioService } from '../../../core/services/usuario';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class Usuarios implements OnInit {
  usuarios: UsuarioAdmin[] = [];
  usuariosFiltrados: UsuarioAdmin[] = [];
  busqueda = '';
  filtroRol = '';
  filtroEstado = '';
  cargando = true;
  error = '';
  procesandoId: number | null = null;

  constructor(
    private usuarioService: UsuarioService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  // =========================================================
  // CARGAR USUARIOS
  // =========================================================
  cargarUsuarios(): void {
    this.cargando = true;
    this.error = '';

    this.usuarioService.listarTodos().subscribe({
      next: (usuarios: UsuarioAdmin[]) => {
        this.usuarios = usuarios ?? [];
        this.usuarios.sort((a: UsuarioAdmin, b: UsuarioAdmin) => a.idUsuario - b.idUsuario);
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        console.error('Error cargando usuarios:', error);
        this.error = 'No se pudieron cargar los usuarios.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================
  // FILTROS
  // =========================================================
  aplicarFiltros(): void {
    const texto = this.busqueda.trim().toLowerCase();

    this.usuariosFiltrados = this.usuarios.filter((usuario: UsuarioAdmin) => {
      const nombreCompleto = (`${usuario.nombre ?? ''} ` + `${usuario.apellido ?? ''}`).trim().toLowerCase();
      const correo = (usuario.correo ?? '').toLowerCase();
      const id = String(usuario.idUsuario);

      const coincideBusqueda = !texto || nombreCompleto.includes(texto) || correo.includes(texto) || id.includes(texto);
      const coincideRol = !this.filtroRol || usuario.rol === this.filtroRol;

      let coincideEstado = true;

      if (this.filtroEstado === 'ACTIVO') {
        coincideEstado = usuario.estado === true;
      }

      if (this.filtroEstado === 'INACTIVO') {
        coincideEstado = usuario.estado === false;
      }

      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }

  // =========================================================
  // LIMPIAR FILTROS
  // =========================================================
  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroRol = '';
    this.filtroEstado = '';
    this.aplicarFiltros();
  }

  // =========================================================
  // CAMBIAR ESTADO
  // =========================================================
  cambiarEstado(usuario: UsuarioAdmin): void {
    if (this.procesandoId !== null) {
      return;
    }

    const nuevoEstado = !usuario.estado;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const confirmado = window.confirm(
      `¿Deseas ${accion} al usuario ` +
      `${this.nombreCompleto(usuario)}?`
    );

    if (!confirmado) {
      return;
    }

    this.procesandoId = usuario.idUsuario;

    this.usuarioService.cambiarEstado(usuario.idUsuario, nuevoEstado).subscribe({
      next: (actualizado: UsuarioAdmin) => {
        const indice = this.usuarios.findIndex(
          (item: UsuarioAdmin) => item.idUsuario === actualizado.idUsuario
        );

        if (indice !== -1) {
          this.usuarios[indice] = actualizado;
        }

        this.aplicarFiltros();
        this.procesandoId = null;
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        console.error('Error actualizando usuario:', error);
        window.alert('No se pudo actualizar el estado del usuario.');
        this.procesandoId = null;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.procesandoId = null;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================
  // ESTADÍSTICAS
  // =========================================================
  get totalUsuarios(): number {
    return this.usuarios.length;
  }

  get usuariosActivos(): number {
    return this.usuarios.filter((usuario: UsuarioAdmin) => usuario.estado).length;
  }

  get usuariosInactivos(): number {
    return this.usuarios.filter((usuario: UsuarioAdmin) => !usuario.estado).length;
  }

  get administradores(): number {
    return this.usuarios.filter(
      (usuario: UsuarioAdmin) => this.esAdministrador(usuario)
    ).length;
  }

  // =========================================================
  // ROLES DISPONIBLES
  // =========================================================
  get roles(): string[] {
    return [
      ...new Set(
        this.usuarios
          .map((usuario: UsuarioAdmin) => usuario.rol)
          .filter((rol: string) => Boolean(rol))
      )
    ];
  }

  // =========================================================
  // UTILIDADES
  // =========================================================
  nombreCompleto(usuario: UsuarioAdmin): string {
    const nombre = (`${usuario.nombre ?? ''} ` + `${usuario.apellido ?? ''}`).trim();
    return nombre || 'Sin nombre';
  }

  iniciales(usuario: UsuarioAdmin): string {
    const primera = usuario.nombre?.charAt(0)?.toUpperCase() ?? '';
    const segunda = usuario.apellido?.charAt(0)?.toUpperCase() ?? '';
    return (primera + segunda) || 'U';
  }

  esAdministrador(usuario: UsuarioAdmin): boolean {
    const rol = (usuario.rol ?? '').toUpperCase();
    return rol === 'ADMIN' || rol === 'ADMINISTRADOR';
  }
}