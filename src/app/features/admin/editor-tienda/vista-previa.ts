import { Component, inject, signal } from '@angular/core';
import { EditorTiendaService, ContenidoEditor } from '../../../core/services/editor-tienda.service';
import { TiendaService } from '../../../core/services/tienda.service';
import { Home } from '../../home/home';

@Component({
  imports: [Home],
  template: `
    @if (contenido(); as borrador) {
      <p class="p-3 text-center text-sm" role="status">Vista previa del borrador</p>
      <div inert>
        <app-home [vistaPrevia]="borrador" />
      </div>
    } @else if (error()) {
      <p class="p-4" role="alert">No se pudo cargar la vista previa.</p>
    } @else {
      <p class="p-4" role="status">Cargando vista previa…</p>
    }
  `
})
export class VistaPreviaTienda {
  readonly contenido = signal<ContenidoEditor | null>(null);
  readonly error = signal(false);

  constructor() {
    const tienda = inject(TiendaService);
    inject(EditorTiendaService).obtener().subscribe({
      next: borrador => {
        tienda.aplicarTema(borrador.contenido.tema);
        this.contenido.set(borrador.contenido);
      },
      error: () => this.error.set(true)
    });
  }
}
