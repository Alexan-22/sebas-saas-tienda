
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';

import { TiendaService } from '../../../core/services/tienda.service';
import { CabeceraTiendaService } from '../../../core/services/cabecera-tienda.service';
import { FooterTiendaService } from '../../../core/services/footer-tienda.service';
import {
  BorradorTienda, EditorTiendaService, SeccionHome, TemaEditor, VersionTienda
} from '../../../core/services/editor-tienda.service';

@Component({
  selector: 'app-editor-tienda',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './editor-tienda.html',
  styleUrl: './editor-tienda.css'
})
export class EditorTienda {
  private readonly editor = inject(EditorTiendaService);
  private readonly tienda = inject(TiendaService);
  private readonly cabecera = inject(CabeceraTiendaService);
  private readonly footer = inject(FooterTiendaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly borrador = signal<BorradorTienda | null>(null);
  readonly versiones = signal<VersionTienda[]>([]);
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly ancho = signal(390);
  readonly orden = signal<SeccionHome[]>([]);
  readonly ordenPendiente = signal(false);

  tema: TemaEditor = {
    primario: '#171717',
    secundario: '#ffffff',
    tipografia: 'SANS'
  };

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

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.ocupado.set(true);
    this.error.set('');

    forkJoin({
      borrador: this.editor.obtener(),
      versiones: this.editor.historial()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

    this.actualizar(
      this.editor.guardarHome(borrador.revision, this.orden()),
      'Orden guardado en el borrador.'
    );
  }

  guardarTema(): void {
    const borrador = this.borrador();
    if (!borrador || this.ocupado()) return;

    this.actualizar(
      this.editor.guardar('tema', borrador.revision, this.tema),
      'Tema guardado en el borrador.'
    );
  }

  private aplicarBorrador(borrador: BorradorTienda): void {
    const tienda = this.tienda.tiendaActual();

    this.tema = borrador.contenido.tema
      ? { ...borrador.contenido.tema }
      : {
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
    if (!revision || this.ocupado() || this.ordenPendiente()) return;

    if (!window.confirm(
      '¿Publicar la cabecera, el orden de inicio y el pie de página de este borrador?'
    )) return;

    this.actualizar(
      this.editor.publicar(revision),
      'Cambios publicados.',
      true
    );
  }

  restaurar(version: number): void {
    const borrador = this.borrador();
    if (!borrador || this.ocupado()) return;

    if (borrador.revision && !window.confirm(
      '¿Reemplazar el borrador actual por esta versión?'
    )) return;

    this.actualizar(
      this.editor.restaurar(version, borrador.revision),
      'Versión restaurada como borrador.'
    );
  }

  private actualizar(
    solicitud: Observable<BorradorTienda>,
    mensaje: string,
    publicado = false
  ): void {
    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');

    solicitud
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
          this.error.set(
            e.status === 409
              ? 'El borrador cambió. Recarga el editor.'
              : 'No se pudo completar la operación.'
          );
          this.ocupado.set(false);
        }
      });
  }
}
