import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout, finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Producto } from '../../../core/models/producto';
import { ProductoService } from '../../../core/services/producto';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink
  ],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private versionCarga = 0;


  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];

  busqueda = '';

  cargando = true;
  error = '';
  mensaje = '';

  eliminandoId: number | null = null;
  eliminandoDefinitivoId: number | null = null;

  private readonly uploadsUrl =
    `${environment.apiUrl}/uploads/`;

  constructor(
    private productoService: ProductoService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {

    this.cargando = true;
    this.error = '';

    this.productoService.listarAdmin().subscribe({

      next: productos => {
        this.productos = productos ?? [];
        this.aplicarFiltro();
        this.cargando = false;
      },

      error: error => {
        console.error(error);

        this.error =
          'No se pudieron cargar los productos.';

        this.cargando = false;
      }

    });
  }

  aplicarFiltro(): void {

    const texto =
      this.busqueda.trim().toLowerCase();

    if (!texto) {
      this.productosFiltrados =
        [...this.productos];

      return;
    }

    this.productosFiltrados =
      this.productos.filter(producto => {

        const nombre =
          producto.nombre?.toLowerCase() ?? '';

        const categoria =
          producto.categoria
            ?.nombreCategoria
            ?.toLowerCase() ?? '';

        const genero =
          producto.genero
            ?.nombreGenero
            ?.toLowerCase() ?? '';

        return (
          nombre.includes(texto) ||
          categoria.includes(texto) ||
          genero.includes(texto)
        );
      });
  }

  imagenUrl(producto: Producto):
    string | null {

    if (!producto.imagen) {
      return null;
    }

    return this.uploadsUrl +
      producto.imagen;
  }

  precioActual(producto: Producto):
    number {

    if (
      producto.precioOferta != null &&
      producto.precioOferta > 0 &&
      producto.precioOferta <
      producto.precio
    ) {
      return producto.precioOferta;
    }

    return producto.precio;
  }

  eliminarProducto(
    producto: Producto
  ): void {

    const confirmar =
      window.confirm(
        `¿Eliminar "${producto.nombre}"?`
      );

    if (!confirmar) {
      return;
    }

    this.eliminandoId =
      producto.idProducto;

    this.productoService
      .eliminar(producto.idProducto)
      .subscribe({

        next: () => {
          this.eliminandoId = null;
          this.cargarProductos();
        },

        error: error => {
          console.error(error);

          this.eliminandoId = null;

          window.alert(
            'No se pudo eliminar el producto.'
          );
        }

      });
  }

  get totalNuevos(): number {
    return this.productos.filter(
      p => p.nuevo
    ).length;
  }

  get totalDestacados(): number {
    return this.productos.filter(
      p => p.destacado
    ).length;
  }

  // ELIMINAR DEFINITIVAMENTE
  eliminarDefinitivamente(producto: Producto): void {
    if (this.eliminandoId !== null ||
        this.eliminandoDefinitivoId !== null ||
        this.cargando) return;

    const id = producto.idProducto;

    if (!Number.isInteger(id) || id <= 0) {
      window.alert('Identificador de producto inválido.');
      return;
    }

    const confirmar = window.confirm(
      `¿ELIMINAR DEFINITIVAMENTE "${producto.nombre}"?\n\n` +
      'El producto se borrará de la base de datos y del panel.\n' +
      'Esta acción no se puede deshacer.\n\n' +
      'Si tiene ventas o movimientos históricos, el servidor bloqueará el borrado.'
    );

    if (!confirmar) return;

    this.eliminandoDefinitivoId = id;
    this.mensaje = '';
    this.cdr.markForCheck();

    this.productoService.eliminarDefinitivamente(id)
      .pipe(
        timeout(30000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.eliminandoDefinitivoId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          ++this.versionCarga;
          this.productos = this.productos.filter(
            p => p.idProducto !== id
          );
          this.aplicarFiltro();
          this.mensaje = `Producto "${producto.nombre}" eliminado definitivamente.`;
          this.cargarProductos();
        },
        error: error => {
          console.error('Error eliminando producto:', error);

          let mensajeError = 'No se pudo eliminar el producto.';

          if (error instanceof HttpErrorResponse) {
            switch (error.status) {
              case 0:
                mensajeError = 'No se pudo conectar con Spring Boot.';
                break;
              case 401:
              case 403:
                mensajeError = 'No tienes permisos para eliminar este producto.';
                break;
              case 404:
                mensajeError = 'Producto no encontrado o no pertenece a esta tienda.';
                break;
              case 405:
                mensajeError = 'El backend no tiene disponible la eliminación definitiva.';
                break;
              case 409:
                mensajeError = 'Este producto tiene registros históricos o relacionados. Puedes desactivarlo.';
                break;
              case 500:
                mensajeError = 'Error interno del backend. Revisa los registros de Spring Boot.';
                break;
            }
          } else if (error instanceof Error && error.name === 'TimeoutError') {
            mensajeError = 'La operación tardó demasiado. Actualiza la lista antes de reintentar.';
          }

          window.alert(mensajeError);
          this.cdr.markForCheck();
        }
      });
  }
}
