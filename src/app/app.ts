import { Component, OnInit, inject, signal } from '@angular/core';
import { catchError, of, switchMap } from 'rxjs';
import { EditorTiendaService } from './core/services/editor-tienda.service';
import { RouterOutlet } from '@angular/router';
import { TiendaService } from './core/services/tienda.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (estado() === 'lista') {
      <router-outlet></router-outlet>
    } @else if (estado() === 'error') {
      <main class="tenant-error" role="alert">
        <h1>No pudimos abrir esta tienda</h1>
        <p>Comprueba la dirección o vuelve a intentarlo. No se mostrarán datos de otra tienda.</p>
        <button type="button" (click)="reintentar()">Volver a intentar</button>
      </main>
    } @else {
      <main class="tenant-error" aria-live="polite"><p>Cargando tienda...</p></main>
    }
  `,
  styles: [`
    .tenant-error{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;text-align:center;padding:2rem;font-family:Arial,sans-serif;background:#faf9f7;color:#151515}
    .tenant-error h1{font-size:clamp(1.5rem,4vw,2.5rem);margin:0}
    .tenant-error p{max-width:35rem;color:#666;line-height:1.6}
    .tenant-error button{background:#161616;color:white;border:0;padding:.9rem 1.6rem;cursor:pointer}
  `]
})
export class AppComponent implements OnInit {
  private readonly tiendaService = inject(TiendaService);
  private readonly editor = inject(EditorTiendaService);
  readonly estado = signal<'cargando' | 'lista' | 'error'>('cargando');
  ngOnInit(): void { this.reintentar(); }
  reintentar(): void {
    this.estado.set('cargando');
    this.tiendaService.cargarConfiguracion().pipe(
      switchMap(() => this.editor.publicado().pipe(catchError(() => of(null))))
    ).subscribe({
      next: diseno => {
        this.tiendaService.aplicarTema(diseno?.tema);
        this.estado.set('lista');
      },
      error: error => {
        console.error('Configuración de tienda:', error);
        this.estado.set('error');
      }
    });
  }
}
export { AppComponent as App };
