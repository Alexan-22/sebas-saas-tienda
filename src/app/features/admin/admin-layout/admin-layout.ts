import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { TiendaService } from '../../../core/services/tienda.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayout {
  menuReportesAbierto = true;

  alternarReportes(): void {
    this.menuReportesAbierto = !this.menuReportesAbierto;
  }

  esReporteActivo(vista: string): boolean {
    const ruta = this.router.url;

    if (ruta.split('?')[0] !== '/admin/reportes') {
      return false;
    }

    const parametros = this.router.parseUrl(ruta).queryParams;

    return (parametros['vista'] ?? 'ventas') === vista;
  }

  menuAbierto = false;

  constructor(
    public authService: AuthService,
    public tiendaService: TiendaService,
    private router: Router
  ) {}

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.menuAbierto = false;
    this.router.navigate(['/login']);
  }
}
