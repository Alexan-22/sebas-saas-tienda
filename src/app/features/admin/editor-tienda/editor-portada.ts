import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EditorTiendaService, PortadaEditor } from '../../../core/services/editor-tienda.service';

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <main class="mx-auto max-w-4xl space-y-5 p-5">
      <a routerLink="/admin/editor-tienda" class="underline">Volver al Editor de tienda</a>
      <h1 class="text-3xl font-semibold">Portada de la tienda</h1>
      <p>Prepara las imágenes desde <a routerLink="/admin/home" class="underline">Banners y colecciones</a>
        y elige cuáles aparecerán en el borrador.</p>
      @if (error()) {
        <p role="alert" class="text-red-800">{{ error() }}</p>
      }
      @if (mensaje()) {
        <p role="status" class="text-green-800">{{ mensaje() }}</p>
      }
      @if (portada(); as datos) {
        <fieldset class="space-y-4" [disabled]="ocupado()">
          <legend class="text-xl font-semibold">Banners</legend>
          @for (banner of datos.banners; track banner.id) {
            <div class="flex flex-wrap items-center gap-4 rounded-lg border p-3">
              <label><input type="checkbox" [(ngModel)]="banner.visible"> {{ banner.titulo || ("Banner " + banner.id) }}</label>
              <label>Orden <input class="w-20 rounded border p-1" type="number" min="1" [(ngModel)]="banner.orden"></label>
              <label>Subir imagen de escritorio
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  [disabled]="!revision" (change)="subir($event, 'ESCRITORIO', banner.id)">
              </label>
              <label>Subir imagen móvil
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  [disabled]="!revision" (change)="subir($event, 'MOVIL', banner.id)">
              </label>
              <label>Imagen móvil
                <select class="rounded border p-1" [(ngModel)]="banner.movil">
                  <option [ngValue]="null">Usar imagen de escritorio</option>
                  @if (banner.movil && !imagenes.some(tieneImagen(banner.movil))) {
                    <option [ngValue]="banner.movil">Imagen del borrador</option>
                  }
                  @for (imagen of imagenes; track imagen.id) {
                    <option [ngValue]="imagen.escritorio">Imagen del banner {{ imagen.id }}</option>
                  }
                </select>
              </label>
            </div>
          }
          @empty {
            <p>Añade un banner en Banners y colecciones para incorporarlo.</p>
          }
        </fieldset>
        <fieldset class="space-y-4" [disabled]="ocupado()">
          <legend class="text-xl font-semibold">Colecciones</legend>
          @for (coleccion of datos.colecciones; track coleccion.id) {
            <div class="flex flex-wrap items-center gap-4 rounded-lg border p-3">
              <label><input type="checkbox" [(ngModel)]="coleccion.visible"> Mostrar colección {{ coleccion.id }}</label>
              <label>Subir imagen de colección
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  [disabled]="!revision" (change)="subir($event, 'COLECCION', coleccion.id)">
              </label>
              <label>Título <input class="rounded border p-1" maxlength="100" [(ngModel)]="coleccion.titulo"></label>
              <label>Orden <input class="w-20 rounded border p-1" type="number" min="1" [(ngModel)]="coleccion.orden"></label>
            </div>
          }
          @empty {
            <p>Añade una colección en Banners y colecciones para incorporarla.</p>
          }
        </fieldset>
        @if (!revision) {
          <p>Guarda la portada para habilitar la carga de imágenes.</p>
        }
        <button type="button" class="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          [disabled]="ocupado()" (click)="guardar()">Guardar borrador</button>
      } @else if (ocupado()) {
        <p role="status">Cargando portada…</p>
      }
    </main>
  `
})
export class EditorPortada {
  private readonly editor = inject(EditorTiendaService);
  revision = 0;
  readonly portada = signal<PortadaEditor | null>(null);
  readonly ocupado = signal(true);
  readonly mensaje = signal('');
  readonly error = signal('');
  imagenes: PortadaEditor['banners'] = [];

  constructor() {
    forkJoin({ borrador: this.editor.obtener(), recursos: this.editor.recursosHome() }).subscribe({
      next: ({ borrador, recursos }) => {
        this.revision = borrador.revision;
        this.imagenes = recursos.banners.filter(banner => banner.escritorio);
        const anterior = borrador.contenido.portada;
        this.portada.set({
          banners: recursos.banners.map(banner => {
            const guardado = anterior?.banners.find(item => item.id === banner.id);
            const movil = guardado?.movil ?? null;
            return guardado
              ? { ...guardado, movil }
              : { ...banner, visible: anterior ? false : banner.visible };
          }),
          colecciones: recursos.colecciones.map(coleccion => {
            const guardada = anterior?.colecciones.find(item => item.id === coleccion.id);
            return guardada ? { ...guardada }
              : { ...coleccion, visible: anterior ? false : coleccion.visible };
          })
        });
        this.ocupado.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la portada.');
        this.ocupado.set(false);
      }
    });
  }

  tieneImagen(ruta: string): (banner: PortadaEditor['banners'][number]) => boolean {
    return banner => banner.escritorio === ruta;
  }

  subir(evento: Event, destino: 'ESCRITORIO' | 'MOVIL' | 'COLECCION', id: number): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || !this.revision || this.ocupado()) return;

    const portada = this.portada();
    if (!portada) return;
    if (archivo.size > 5 * 1024 * 1024) {
      this.error.set('La imagen no puede superar los 5 MB.');
      return;
    }

    this.error.set('');
    this.mensaje.set('');
    this.ocupado.set(true);
    this.editor.subirImagen(this.revision, destino, id, archivo).subscribe({
      next: borrador => {
        this.revision = borrador.revision;
        const guardada = borrador.contenido.portada;
        if (destino === 'COLECCION') {
          const actual = portada.colecciones.find(item => item.id === id);
          if (actual) actual.imagen = guardada?.colecciones.find(item => item.id === id)?.imagen ?? null;
        } else {
          const actual = portada.banners.find(item => item.id === id);
          const banner = guardada?.banners.find(item => item.id === id);
          if (actual && banner) {
            actual.escritorio = banner.escritorio;
            actual.movil = banner.movil;
          }
        }
        this.mensaje.set('Imagen guardada en el borrador.');
        this.ocupado.set(false);
      },
      error: respuesta => {
        this.error.set(respuesta.status === 409
          ? 'El borrador cambió o el recurso aún no se ha guardado. Recarga o guarda la portada.'
          : 'No se pudo subir la imagen. Comprueba el archivo e inténtalo de nuevo.');
        this.ocupado.set(false);
      }
    });
  }

  guardar(): void {
    const datos = this.portada();
    if (!datos || this.ocupado()) return;

    this.mensaje.set('');
    this.error.set('');
    if ([...datos.banners, ...datos.colecciones].some(item => !Number.isInteger(item.orden) || item.orden < 1)) {
      this.error.set('Indica un número entero positivo para cada posición.');
      return;
    }

    this.ocupado.set(true);
    this.editor.guardar('portada', this.revision, datos).subscribe({
      next: borrador => {
        this.revision = borrador.revision;
        this.mensaje.set('Borrador guardado. Puedes previsualizarlo desde el Editor de tienda.');
        this.ocupado.set(false);
      },
      error: respuesta => {
        this.error.set(respuesta.status === 409 ? 'El borrador cambió. Recarga esta página.' : 'No se pudo guardar la portada.');
        this.ocupado.set(false);
      }
    });
  }
}
