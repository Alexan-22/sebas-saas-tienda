import { FormsModule } from '@angular/forms';
import { TiendaService } from '../../../core/services/tienda.service';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { CabeceraTiendaService } from '../../../core/services/cabecera-tienda.service';
import { FooterTiendaService } from '../../../core/services/footer-tienda.service';
import { BorradorTienda, EditorTiendaService, SeccionHome, TemaEditor, VersionTienda } from '../../../core/services/editor-tienda.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-editor-tienda',
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <main class="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
      <header>
        <h1 class="text-3xl font-semibold">Editor de tienda</h1>
        <p class="mt-2 text-slate-600">Elige qué parte de tu tienda quieres editar.</p>
      </header>

      @if (error()) {
        <p role="alert" class="text-red-800">{{ error() }}</p>
      }
      @if (mensaje()) {
        <p role="status" class="text-green-800">{{ mensaje() }}</p>
      }
      <div class="flex flex-wrap gap-3">
        <button type="button" class="rounded-lg border px-4 py-2" [disabled]="ocupado()" (click)="cargar()">
          Recargar
        </button>
        <button type="button" class="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          [disabled]="ocupado() || !borrador()?.revision || ordenPendiente()" (click)="publicar()">
          Publicar borrador
        </button>
      </div>

      <nav aria-label="Secciones del editor" class="grid gap-4 sm:grid-cols-2">
        @for (seccion of secciones; track seccion.ruta) {
          <a [routerLink]="seccion.ruta"
            class="rounded-xl border border-slate-200 bg-white p-5 hover:border-violet-500
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
            <h2 class="font-semibold">{{ seccion.titulo }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ seccion.descripcion }}</p>
          </a>
        }
      </nav>

      @if (borrador()) {
        <form class="flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4" (ngSubmit)="guardarTema()">
          <label class="grid gap-2">Color principal
            <input type="color" name="primario" [(ngModel)]="tema.primario" [disabled]="ocupado()">
          </label>
          <label class="grid gap-2">Color secundario
            <input type="color" name="secundario" [(ngModel)]="tema.secundario" [disabled]="ocupado()">
          </label>
          <label class="grid gap-2">Tipografía
            <select class="rounded border p-2" name="tipografia" [(ngModel)]="tema.tipografia" [disabled]="ocupado()">
              <option value="SANS">Sans serif</option>
              <option value="SERIF">Serif</option>
              <option value="MONO">Monoespaciada</option>
            </select>
          </label>
          <button type="submit" class="rounded border px-3 py-2" [disabled]="ocupado()">Guardar tema en el borrador</button>
        </form>
        <section aria-labelledby="orden-home" class="space-y-3">
          <h2 id="orden-home" class="text-xl font-semibold">Orden de la página de inicio</h2>
          <ol class="space-y-2">
            @for (seccion of orden(); track seccion; let i = $index) {
              <li class="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                <span>{{ nombres[seccion] }}</span>
                <div class="flex gap-2">
                  <button type="button" class="rounded border px-2 disabled:opacity-40"
                    [attr.aria-label]="'Subir ' + nombres[seccion]" [disabled]="ocupado() || i === 0"
                    (click)="mover(i, -1)">↑</button>
                  <button type="button" class="rounded border px-2 disabled:opacity-40"
                    [attr.aria-label]="'Bajar ' + nombres[seccion]"
                    [disabled]="ocupado() || i === orden().length - 1" (click)="mover(i, 1)">↓</button>
                </div>
              </li>
            }
          </ol>
          <button type="button" class="rounded-lg border px-4 py-2" [disabled]="ocupado() || !ordenPendiente()"
            (click)="guardarOrden()">Guardar orden en el borrador</button>
        </section>
      }

      @if (borrador()?.revision) {
        <section aria-labelledby="vista-previa-titulo" class="space-y-3">
          <h2 id="vista-previa-titulo" class="text-xl font-semibold">Vista previa</h2>
          <div class="flex flex-wrap gap-2">
            @for (dispositivo of dispositivos; track dispositivo.ancho) {
              <button type="button" class="rounded-lg border px-3 py-2 aria-pressed:bg-slate-100"
                [attr.aria-pressed]="ancho() === dispositivo.ancho" (click)="ancho.set(dispositivo.ancho)">
                {{ dispositivo.nombre }}
              </button>
            }
          </div>
          <div class="overflow-x-auto rounded-lg border">
            @for (revision of [borrador()?.revision]; track revision) {
              <iframe title="Vista previa de la tienda" src="/vista-previa-tienda" loading="lazy"
                class="block h-[520px] max-w-none border-0" [style.width.px]="ancho()"></iframe>
            }
          </div>
        </section>
      }

      <section aria-labelledby="historial-titulo" class="space-y-3">
        <h2 id="historial-titulo" class="text-xl font-semibold">Historial</h2>
        @if (borrador() && !versiones().length) {
          <p class="text-slate-600">Aún no hay versiones publicadas.</p>
        }
        @for (version of versiones(); track version.version) {
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3">
            <p>{{ version.version === 0 ? 'Configuración inicial' : 'Versión ' + version.version }}
              · {{ version.publicadoEn | date:'medium' }} · {{ version.autor }}</p>
            <button type="button" class="rounded-lg border px-3 py-2" [disabled]="ocupado() || !borrador()"
              (click)="restaurar(version.version)">
              Restaurar como borrador
            </button>
          </div>
        }
      </section>
    </main>
  `
})
export class EditorTienda {
  private readonly editor = inject(EditorTiendaService);
  private readonly tienda = inject(TiendaService);
  tema: TemaEditor = { primario: '#171717', secundario: '#ffffff', tipografia: 'SANS' };
  private readonly cabecera = inject(CabeceraTiendaService);
  private readonly footer = inject(FooterTiendaService);
  readonly borrador = signal<BorradorTienda | null>(null);
  readonly versiones = signal<VersionTienda[]>([]);
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly ancho = signal(390);
  readonly orden = signal<SeccionHome[]>([]);
  readonly ordenPendiente = signal(false);
  readonly nombres: Record<SeccionHome, string> = {
    BANNERS: 'Banners',
    CATEGORIAS: 'Categorías',
    COLECCIONES: 'Colecciones',
    PRODUCTOS: 'Productos',
    CIERRE: 'Cierre',
    BENEFICIOS: 'Beneficios'
  };
  readonly dispositivos = [
    { nombre: 'Móvil', ancho: 390 },
    { nombre: 'Tablet', ancho: 768 },
    { nombre: 'Escritorio', ancho: 1280 }
  ];

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.ocupado.set(true);
    this.error.set('');
    forkJoin({ borrador: this.editor.obtener(), versiones: this.editor.historial() }).subscribe({
      next: ({ borrador, versiones }) => {
        this.aplicarBorrador(borrador);
        this.versiones.set(versiones);
        this.ocupado.set(false);
      },
      error: () => {
        this.borrador.set(null);
        this.error.set('No se pudo cargar el editor.');
        this.ocupado.set(false);
      }
    });
  }

  mover(indice: number, direccion: -1 | 1): void {
    const siguiente = indice + direccion;
    const secciones = [...this.orden()];
    if (siguiente < 0 || siguiente >= secciones.length) return;
    [secciones[indice], secciones[siguiente]] = [secciones[siguiente], secciones[indice]];
    this.orden.set(secciones);
    this.ordenPendiente.set(true);
  }

  guardarOrden(): void {
    const borrador = this.borrador();
    if (!borrador || this.ocupado() || !this.ordenPendiente()) return;
    this.actualizar(this.editor.guardarHome(borrador.revision, this.orden()), 'Orden guardado en el borrador.');
  }

  guardarTema(): void {
    const borrador = this.borrador();
    if (!borrador || this.ocupado()) return;
    this.actualizar(this.editor.guardar('tema', borrador.revision, this.tema), 'Tema guardado en el borrador.');
  }

  private aplicarBorrador(borrador: BorradorTienda): void {
    const tienda = this.tienda.tiendaActual();
    this.tema = borrador.contenido.tema ? { ...borrador.contenido.tema } : {
      primario: tienda?.colorPrimario || '#171717',
      secundario: tienda?.colorSecundario || '#ffffff',
      tipografia: 'SANS'
    };
    this.borrador.set(borrador);
    this.orden.set([...borrador.contenido.seccionesHome]);
    this.ordenPendiente.set(false);
  }

  publicar(): void {
    const revision = this.borrador()?.revision;
    if (!revision || this.ocupado()) return;
    if (!window.confirm('¿Publicar la cabecera, el orden de inicio y el pie de página de este borrador?')) return;

    this.actualizar(this.editor.publicar(revision), 'Cambios publicados.', true);
  }

  restaurar(version: number): void {
    const borrador = this.borrador();
    if (!borrador || this.ocupado()) return;
    if (borrador.revision && !window.confirm('¿Reemplazar el borrador actual por esta versión?')) return;

    this.actualizar(this.editor.restaurar(version, borrador.revision), 'Versión restaurada como borrador.');
  }

  private actualizar(solicitud: Observable<BorradorTienda>, mensaje: string, publicado = false): void {
    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');
    solicitud.subscribe({
      next: borrador => {
        this.aplicarBorrador(borrador);
        this.ocupado.set(false);
        this.mensaje.set(mensaje);
        if (publicado) {
          this.tienda.aplicarTema(borrador.contenido.tema);
          this.cabecera.actualizarPublico();
          this.footer.actualizarPublico();
          this.cargar();
        }
      },
      error: e => {
        this.error.set(e.status === 409
          ? 'El borrador cambió. Recarga el editor.'
          : 'No se pudo completar la operación.');
        this.ocupado.set(false);
      }
    });
  }

  readonly secciones = [
    {
      ruta: '/admin/personalizacion-cabecera',
      titulo: 'Cabecera y navegación',
      descripcion: 'Menú y barra promocional'
    },
    {
      ruta: '/admin/editor-tienda/portada',
      titulo: 'Portada',
      descripcion: 'Banners para escritorio y móvil, y colecciones del borrador'
    },
    {
      ruta: '/admin/home',
      titulo: 'Página de inicio',
      descripcion: 'Banners y colecciones'
    },
    {
      ruta: '/admin/personalizacion-footer',
      titulo: 'Pie de página',
      descripcion: 'Descripción, contacto y redes sociales'
    },
    {
      ruta: '/admin/configuracion',
      titulo: 'Identidad visual',
      descripcion: 'Nombre, logo y colores de la tienda'
    }
  ];
}
