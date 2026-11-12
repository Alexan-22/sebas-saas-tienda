
import { Component, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { TiendaService } from '../../../core/services/tienda.service';

type GrupoMenu =
  | 'catalogo'
  | 'operaciones'
  | 'pagos'
  | 'reportes'
  | 'administracion';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayout {

  public readonly authService = inject(AuthService);
  public readonly tiendaService = inject(TiendaService);
  public readonly router = inject(Router);

  menuAbierto = false;

  private readonly gruposAbiertos = signal<
    Record<GrupoMenu, boolean>
  >({
    catalogo: true,
    operaciones: true,
    pagos: false,
    reportes: false,
    administracion: true
  });

  get menuReportesAbierto(): boolean {
    return this.grupoAbierto('reportes');
  }

  grupoAbierto(grupo: GrupoMenu): boolean {
    return this.gruposAbiertos()[grupo];
  }

  alternarGrupo(grupo: GrupoMenu): void {
    this.gruposAbiertos.update(estado => ({
      ...estado,
      [grupo]: !estado[grupo]
    }));
  }

  alternarReportes(): void {
    this.alternarGrupo('reportes');
  }

  esReporteActivo(vista: string): boolean {
    const ruta = this.router.url;

    if (ruta.split('?')[0] !== '/admin/reportes') {
      return false;
    }

    const parametros = this.router.parseUrl(ruta).queryParams;

    return (parametros['vista'] ?? 'ventas') === vista;
  }

  esRutaActiva(rutas: string[]): boolean {
    const actual = this.router.url.split('?')[0].split('#')[0];

    return rutas.some(ruta =>
      actual === ruta ||
      actual.startsWith(`${ruta}/`)
    );
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  abrirTienda(): void {
    this.cerrarMenu();

    void this.router.navigate(['/']);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.cerrarMenu();

    void this.router.navigate(['/login']);
  }
}
