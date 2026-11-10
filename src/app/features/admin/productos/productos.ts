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

  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];

  busqueda = '';

  cargando = true;
  error = '';

  eliminandoId: number | null = null;

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

    this.productoService.listar().subscribe({

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
}