import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ProductoTalla } from '../../../core/models/producto-talla';
import { ProductoTallaService } from '../../../core/services/producto-talla';

@Component({
  selector: 'app-kardex',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './kardex.html',
  styleUrl: './kardex.css'
})
export class Kardex implements OnInit {

  inventario: ProductoTalla[] = [];

  busqueda = '';
  cargando = false;
  error = '';

  constructor(
    private readonly productoTallaService: ProductoTallaService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarInventario();
  }

  cargarInventario(): void {
    this.cargando = true;
    this.error = '';

    this.productoTallaService
      .listarInventarioParaReportes()
      .subscribe({
        next: (datos) => {
          this.inventario = Array.isArray(datos)
            ? datos
            : [];

          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error consultando inventario:', err);

          this.error =
            'No se pudo cargar el inventario. ' +
            'Verifica la conexión y los permisos.';

          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
  }

  get inventarioFiltrado(): ProductoTalla[] {
    const texto = this.busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return this.inventario;
    }

    return this.inventario.filter(item => {
      const contenido = [
        item.producto?.nombre ?? '',
        item.producto?.categoria?.nombreCategoria ?? '',
        item.talla?.nombreTalla ?? '',
        String(item.idProductoTalla)
      ].join(' ').toLowerCase();

      return contenido.includes(texto);
    });
  }

  get totalVariantes(): number {
    return this.inventario.length;
  }

  get totalUnidades(): number {
    return this.inventario.reduce(
      (total, item) => total + Number(item.stock ?? 0),
      0
    );
  }

  get stockBajo(): number {
    return this.inventario.filter(item => {
      const stock = Number(item.stock ?? 0);

      return stock > 0 && stock <= 5;
    }).length;
  }

  get sinStock(): number {
    return this.inventario.filter(
      item => Number(item.stock ?? 0) === 0
    ).length;
  }

  estadoStock(stock: number): string {
    const cantidad = Number(stock);

    if (cantidad <= 0) {
      return 'SIN STOCK';
    }

    if (cantidad <= 5) {
      return 'STOCK BAJO';
    }

    return 'DISPONIBLE';
  }

  claseStock(stock: number): string {
    const cantidad = Number(stock);

    if (cantidad <= 0) {
      return 'sin-stock';
    }

    if (cantidad <= 5) {
      return 'stock-bajo';
    }

    return 'disponible';
  }
}
