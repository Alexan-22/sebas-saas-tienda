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
        this.categorias = data;
        this.cargando = false;
      },
      error: err => {
        this.error = `No se pudieron cargar las categorias (HTTP ${err.status ?? '?'})`;
        this.cargando = false;
      }
    });
  }

  crear(): void {
    const nombre = this.nuevaCategoria.trim();
    if (!nombre || this.guardando) return;
    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.categoriasApi.crear({ nombreCategoria: nombre, estado: true }).subscribe({
      next: () => {
        this.nuevaCategoria = '';
        this.guardando = false;
        this.mensaje = 'Categoria creada correctamente';
        this.cargar();
      },
      error: err => {
        this.error = err.status === 409 ? 'Ya existe una categoria con ese nombre.' :
          `No se pudo crear la categoria (HTTP ${err.status ?? '?'})`;
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
    if (!nombre || this.guardando) return;
    this.actualizar(categoria, nombre, categoria.estado, true);
  }

  cambiarEstado(categoria: Categoria): void {
    if (this.guardando) return;
    this.actualizar(categoria, categoria.nombreCategoria, !categoria.estado, false);
  }

  private actualizar(categoria: Categoria, nombre: string, estado: boolean, finalizarEdicion: boolean): void {
    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.categoriasApi.actualizar(categoria.idCategoria, { nombreCategoria: nombre, estado }).subscribe({
      next: () => {
        this.guardando = false;
        if (finalizarEdicion) this.idEditando = null;
        this.mensaje = 'Categoria actualizada';
        this.cargar();
      },
      error: err => {
        this.error = err.status === 409 ? 'Ya existe una categoria con ese nombre.' :
          `No se pudo actualizar la categoria (HTTP ${err.status ?? '?'})`;
        this.guardando = false;
      }
    });
  }
}
