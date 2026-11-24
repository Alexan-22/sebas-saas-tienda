import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, map, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { PaginaAyuda } from './editor-tienda.service';

@Injectable({ providedIn: 'root' })
export class PaginasAyudaService {
  private readonly http = inject(HttpClient);
  readonly paginas = signal<PaginaAyuda[]>([]);
  readonly cargando = signal(false);
  readonly cargado = signal(false);
  private solicitudActiva = false;

  cargar(): void {
    if (this.cargado() || this.solicitudActiva) return;
    this.solicitudActiva = true;
    this.cargando.set(true);
    this.http.get<{ paginasAyuda?: PaginaAyuda[] }>(`${environment.apiUrl}/api/home/public/diseno`).pipe(
      map(datos => (datos.paginasAyuda ?? []).filter(p => p.visible && p.clave !== 'RECLAMACIONES')),
      catchError(() => of([] as PaginaAyuda[])),
      finalize(() => { this.solicitudActiva = false; this.cargando.set(false); })
    ).subscribe(paginas => { this.paginas.set(paginas); this.cargado.set(true); });
  }
  actualizar(): void { this.cargado.set(false); this.cargar(); }
}