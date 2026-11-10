
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Categoria } from '../../../core/models/producto';
import { CategoriaGestionService } from '../../../core/services/categoria-gestion';

@Component({
  selector: 'app-categorias-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css'
})
export class CategoriasAdmin implements OnInit {

  private readonly categoriasApi = inject(CategoriaGestionService);

  categorias: Categoria[] = [];

  nuevaCategoria = '';
  idEditando: number | null = null;
  nombreEditando = '';

  cargando = false;
  guardando = false;
  eliminandoId: number | null = null;

  error = '';
  mensaje = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    this.categoriasApi.listar().subscribe({
      next: data => {
        this.categorias = data ?? [];
        this.cargando = false;
      },
      error: err => {
        this.error =
          `No se pudieron cargar las categorías (HTTP ${err.status ?? '?'})`;
        this.cargando = false;
      }
    });
  }

  crear(): void {
    const nombre = this.nuevaCategoria.trim();

    if (!nombre || this.guardando || this.eliminandoId !== null) {
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    this.categoriasApi.crear({
      nombreCategoria: nombre,
      estado: true
    }).subscribe({
      next: () => {
        this.nuevaCategoria = '';
        this.guardando = false;
        this.mensaje = 'Categoría creada correctamente.';
        this.cargar();
      },
      error: err => {
        this.error = err.status === 409
          ? 'Ya existe una categoría con ese nombre.'
          : `No se pudo crear la categoría (HTTP ${err.status ?? '?'})`;

        this.guardando = false;
      }
    });
  }

  editar(categoria: Categoria): void {
    this.idEditando = categoria.idCategoria;
    this.nombreEditando = categoria.nombreCategoria;
    this.mensaje = '';
    this.error = '';
  }

  cancelarEdicion(): void {
    this.idEditando = null;
  }

  guardarEdicion(categoria: Categoria): void {
    const nombre = this.nombreEditando.trim();

    if (!nombre || this.guardando) {
      return;
    }

    this.actualizar(
      categoria,
      nombre,
      categoria.estado,
      true
    );
  }

  cambiarEstado(categoria: Categoria): void {
    if (this.guardando || this.eliminandoId !== null) {
      return;
    }

    this.actualizar(
      categoria,
      categoria.nombreCategoria,
      !categoria.estado,
      false
    );
  }

  private actualizar(
    categoria: Categoria,
    nombre: string,
    estado: boolean,
    finalizarEdicion: boolean
  ): void {
    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    this.categoriasApi.actualizar(
      categoria.idCategoria,
      { nombreCategoria: nombre, estado }
    ).subscribe({
      next: () => {
        this.guardando = false;

        if (finalizarEdicion) {
          this.idEditando = null;
        }

        this.mensaje = 'Categoría actualizada.';
        this.cargar();
      },
      error: err => {
        this.error = err.status === 409
          ? 'Ya existe una categoría con ese nombre.'
          : `No se pudo actualizar la categoría (HTTP ${err.status ?? '?'})`;

        this.guardando = false;
      }
    });
  }

  eliminar(categoria: Categoria): void {
    if (this.guardando || this.eliminandoId !== null) {
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar definitivamente la categoría "${categoria.nombreCategoria}"?\n\n` +
      'Solo se eliminará si no tiene productos asociados.\n' +
      'Esta acción no se puede deshacer.'
    );

    if (!confirmado) {
      return;
    }

    this.error = '';
    this.mensaje = '';
    this.eliminandoId = categoria.idCategoria;

    this.categoriasApi.eliminar(categoria.idCategoria)
      .subscribe({
        next: () => {
          this.categorias = this.categorias.filter(
            c => c.idCategoria !== categoria.idCategoria
          );

          if (this.idEditando === categoria.idCategoria) {
            this.idEditando = null;
          }

          this.eliminandoId = null;
          this.mensaje = 'Categoría eliminada correctamente.';
        },
        error: err => {
          this.eliminandoId = null;

          if (err.status === 409) {
            this.error =
              'No puedes eliminar esta categoría porque tiene ' +
              'productos o registros asociados. Puedes desactivarla.';
          } else if (err.status === 404) {
            this.error = 'La categoría no existe en esta tienda.';
          } else if (err.status === 403) {
            this.error = 'No tienes permiso para eliminar categorías.';
          } else {
            this.error =
              `No se pudo eliminar la categoría (HTTP ${err.status ?? '?'}).`;
          }
        }
      });
  }
}
