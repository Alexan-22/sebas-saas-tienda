import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  RbacService,
  RbacRol,
  RbacPermiso
} from '../../../core/services/rbac.service';

@Component({
  selector: 'app-roles-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="p-5 md:p-8 space-y-6 text-slate-900">

      <header>
        <p class="text-xs font-bold uppercase tracking-widest text-violet-600">
          SEGURIDAD Y ACCESOS
        </p>
        <h1 class="mt-2 text-3xl font-bold">Roles y permisos</h1>
        <p class="mt-2 text-slate-500">
          Administra los permisos de los empleados de tu tienda.
        </p>
      </header>

      @if (error()) {
        <div role="alert" class="rounded-xl bg-red-50 p-4 text-red-700">
          {{ error() }}
        </div>
      }

      @if (mensaje()) {
        <div role="status" class="rounded-xl bg-emerald-50 p-4 text-emerald-800">
          {{ mensaje() }}
        </div>
      }

      <section class="grid gap-6 lg:grid-cols-2">

        <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-xl font-bold">Roles existentes</h2>
            <button type="button" (click)="cargar()"
              class="rounded-lg border px-3 py-2 text-sm">
              Actualizar
            </button>
          </div>

          @if (cargando()) {
            <p class="mt-5 text-slate-500">Cargando roles...</p>
          } @else if (roles().length === 0) {
            <p class="mt-5 text-slate-500">
              Aún no hay roles registrados en esta tienda.
            </p>
          } @else {
            <div class="mt-5 space-y-3">
              @for (rol of roles(); track rol.id) {
                <button type="button"
                  (click)="verPermisos(rol)"
                  class="w-full rounded-xl border border-slate-200 p-4 text-left hover:border-violet-400">
                  <div class="flex items-center justify-between gap-3">
                    <strong>{{ rol.nombre }}</strong>
                    <span class="text-xs"
                      [class.text-emerald-700]="rol.activo"
                      [class.text-red-600]="!rol.activo">
                      {{ rol.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-slate-500">
                    {{ rol.descripcion || 'Sin descripción' }}
                  </p>
                </button>
              }
            </div>
          }

          @if (rolSeleccionado()) {
            <div class="mt-6 rounded-xl bg-slate-50 p-4">
              <h3 class="font-bold">
                Permisos de {{ rolSeleccionado()?.nombre }}
              </h3>

              @if (consultandoPermisos()) {
                <p class="mt-3 text-sm">Consultando...</p>
              } @else if (permisosDelRol().length === 0) {
                <p class="mt-3 text-sm text-slate-500">
                  Este rol no tiene permisos asignados.
                </p>
              } @else {
                <div class="mt-3 space-y-2">
                  @for (permiso of permisosDelRol(); track permiso.codigo) {
                    <p class="rounded-lg bg-white px-3 py-2 text-sm">
                      <strong>{{ permiso.codigo }}</strong>
                      <span class="block text-slate-500">
                        {{ permiso.descripcion }}
                      </span>
                    </p>
                  }
                </div>
              }
            </div>
          }
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-xl font-bold">Crear nuevo rol</h2>

          <form (ngSubmit)="crearRol()" class="mt-5 space-y-5">
            <div>
              <label for="nombreRol" class="mb-2 block text-sm font-medium">
                Nombre del rol
              </label>
              <input id="nombreRol" name="nombreRol"
                [(ngModel)]="nombre"
                required maxlength="80"
                class="w-full rounded-xl border border-slate-300 p-3"
                placeholder="Ejemplo: Encargado de almacén" />
            </div>

            <div>
              <label for="descripcionRol" class="mb-2 block text-sm font-medium">
                Descripción
              </label>
              <textarea id="descripcionRol" name="descripcionRol"
                [(ngModel)]="descripcion"
                maxlength="200" rows="3"
                class="w-full rounded-xl border border-slate-300 p-3"
                placeholder="Funciones de este rol"></textarea>
            </div>

            <div>
              <h3 class="mb-3 font-bold">Permisos operativos</h3>

              @for (permiso of permisosOperativos(); track permiso.codigo) {
                <label class="mb-2 flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                  <input type="checkbox"
                    class="mt-1"
                    [checked]="seleccionados().includes(permiso.codigo)"
                    (change)="alternarPermiso(permiso.codigo)" />
                  <span>
                    <strong class="block text-sm">{{ permiso.codigo }}</strong>
                    <span class="text-xs text-slate-500">
                      {{ permiso.descripcion }}
                    </span>
                  </span>
                </label>
              }
            </div>

            <button type="submit"
              [disabled]="guardando() || cargando() || seleccionados().length === 0"
              class="w-full rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white disabled:opacity-50">
              {{ guardando() ? 'Guardando...' : 'Crear rol' }}
            </button>
          </form>
        </article>
      </section>
    </main>
  `
})
export class RolesPermisos implements OnInit {

  private readonly rbac = inject(RbacService);

  readonly roles = signal<RbacRol[]>([]);
  readonly permisosOperativos = signal<RbacPermiso[]>([]);
  readonly permisosDelRol = signal<RbacPermiso[]>([]);
  readonly rolSeleccionado = signal<RbacRol | null>(null);
  readonly seleccionados = signal<string[]>([]);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly consultandoPermisos = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  nombre = '';
  descripcion = '';

  private readonly codigosOperativos = new Set([
    'productos.ver',
    'stock.ver',
    'ventas.ver',
    'pedidos.gestionar'
  ]);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      roles: this.rbac.listarRoles(),
      permisos: this.rbac.listarPermisos()
    }).subscribe({
      next: ({ roles, permisos }) => {
        this.roles.set(roles);
        this.permisosOperativos.set(
          permisos.filter(p => this.codigosOperativos.has(p.codigo))
        );
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los datos RBAC.');
        this.cargando.set(false);
      }
    });
  }

  verPermisos(rol: RbacRol): void {
    this.rolSeleccionado.set(rol);
    this.permisosDelRol.set([]);
    this.consultandoPermisos.set(true);
    this.error.set('');

    this.rbac.permisosDeRol(rol.id).subscribe({
      next: permisos => {
        if (this.rolSeleccionado()?.id === rol.id) {
          this.permisosDelRol.set(permisos);
          this.consultandoPermisos.set(false);
        }
      },
      error: () => {
        if (this.rolSeleccionado()?.id === rol.id) {
          this.error.set('No fue posible consultar los permisos del rol.');
          this.consultandoPermisos.set(false);
        }
      }
    });
  }

  alternarPermiso(codigo: string): void {
    if (!this.codigosOperativos.has(codigo)) return;

    this.seleccionados.update(actual =>
      actual.includes(codigo)
        ? actual.filter(p => p !== codigo)
        : [...actual, codigo]
    );
  }

  crearRol(): void {
    const nombre = this.nombre.trim();

    if (
      this.guardando() ||
      !nombre ||
      this.seleccionados().length === 0
    ) {
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.rbac.crearRol({
      nombre,
      descripcion: this.descripcion.trim(),
      permisos: [...this.seleccionados()]
    }).subscribe({
      next: () => {
        this.nombre = '';
        this.descripcion = '';
        this.seleccionados.set([]);
        this.guardando.set(false);
        this.mensaje.set('Rol creado correctamente.');
        this.cargar();
      },
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo crear el rol. Revisa si ya existe.');
      }
    });
  }
}