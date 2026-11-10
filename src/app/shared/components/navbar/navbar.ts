import { Component, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CarritoService } from '../../../core/services/carrito';
import { AuthService } from '../../../core/services/auth';
import { TiendaService } from '../../../core/services/tienda.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  menuAbierto = false;
  cuentaAbierta = false;
  constructor(
    public readonly carritoService: CarritoService,
    public readonly authService: AuthService,
    public readonly tiendaService: TiendaService,
    private readonly router: Router
  ) {}

  ejecutarBusqueda(texto: string): void {
    const q = texto.trim();
    if (!q) return;
    this.menuAbierto = false;
    void this.router.navigate(['/tienda'], { queryParams: { q } });
  }
  toggleMenu(): void { this.menuAbierto = !this.menuAbierto; this.cuentaAbierta = false; }
  cerrarMenu(): void { this.menuAbierto = false; }
  toggleCuenta(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.authService.autenticado()) { void this.router.navigate(['/login']); return; }
    this.cuentaAbierta = !this.cuentaAbierta;
  }
  cerrarCuenta(): void { this.cuentaAbierta = false; }
  @HostListener('document:click') cerrarCuentaFuera(): void { this.cuentaAbierta = false; }
  get correoUsuario(): string { return this.authService.obtenerCorreo() ?? 'Mi cuenta'; }
  get inicialUsuario(): string { return this.correoUsuario.charAt(0).toUpperCase(); }
  get esAdmin(): boolean { return this.authService.obtenerRol()?.toUpperCase() === 'ADMIN'; }
  irACuenta(): void {
    this.cerrarMenu(); this.cerrarCuenta();
    void this.router.navigate([!this.authService.autenticado() ? '/login' : this.esAdmin ? '/admin/dashboard' : '/mis-compras']);
  }
  irAMisCompras(): void { this.cerrarCuenta(); this.cerrarMenu(); void this.router.navigate(['/mis-compras']); }
  irAAdmin(): void { this.cerrarCuenta(); this.cerrarMenu(); void this.router.navigate(['/admin/dashboard']); }
  cerrarSesion(): void {
    this.authService.logout(); this.cerrarMenu(); this.cerrarCuenta(); void this.router.navigate(['/']);
  }
}
