
import {
  Component,
  inject,
  signal,
  OnInit,
  DestroyRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  templateUrl: './roles-permisos.html',
  styleUrl: './roles-permisos.css'
})
export class RolesPermisos implements OnInit {

  private readonly rbac = inject(RbacService);
  private readonly destroyRef = inject(DestroyRef);

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

  // =====================================
  // CARGAR ROLES Y PERMISOS DISPONIBLES
  // =====================================

  cargar(): void {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      roles: this.rbac.listarRoles(),
      permisos: this.rbac.listarPermisos()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ roles, permisos }) => {
          this.roles.set(roles);

          this.permisosOperativos.set(
            permisos.filter(p =>
              this.codigosOperativos.has(p.codigo)
            )
          );

          this.cargando.set(false);
        },

        error: () => {
          this.error.set(
            'No se pudieron cargar los datos RBAC.'
          );

          this.cargando.set(false);
        }
      });
  }

  // =====================================
  // CONSULTAR PERMISOS DE UN ROL
  // =====================================

  verPermisos(rol: RbacRol): void {
    this.rolSeleccionado.set(rol);
    this.permisosDelRol.set([]);
    this.consultandoPermisos.set(true);
    this.error.set('');

    this.rbac.permisosDeRol(rol.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: permisos => {
          if (this.rolSeleccionado()?.id === rol.id) {
            this.permisosDelRol.set(permisos);
            this.consultandoPermisos.set(false);
          }
        },

        error: () => {
          if (this.rolSeleccionado()?.id === rol.id) {
            this.error.set(
              'No fue posible consultar los permisos del rol.'
            );

            this.consultandoPermisos.set(false);
          }
        }
      });
  }

  // =====================================
  // SELECCIONAR O QUITAR PERMISOS
  // =====================================

  alternarPermiso(codigo: string): void {
    if (!this.codigosOperativos.has(codigo)) {
      return;
    }

    this.seleccionados.update(actual =>
      actual.includes(codigo)
        ? actual.filter(p => p !== codigo)
        : [...actual, codigo]
    );
  }

  // =====================================
  // CREAR NUEVO ROL
  // =====================================

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
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.nombre = '';
          this.descripcion = '';

          this.seleccionados.set([]);
          this.guardando.set(false);

          this.mensaje.set(
            'Rol creado correctamente.'
          );

          this.cargar();
        },

        error: () => {
          this.guardando.set(false);

          this.error.set(
            'No se pudo crear el rol. Revisa si ya existe.'
          );
        }
      });
  }
}
