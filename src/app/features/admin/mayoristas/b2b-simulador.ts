import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { B2bService, ProductoB2b } from '../../../core/services/b2b';
import {
  B2bCotizadorService, ItemCotizacionB2b, ResultadoCotizacionB2b
} from '../../../core/services/b2b-cotizador';

@Component({
  selector: 'app-b2b-simulador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './b2b-simulador.html',
  styleUrl: './b2b-simulador.css'
})
export class B2bSimulador implements OnInit {
  private readonly b2b = inject(B2bService);
  private readonly cotizador = inject(B2bCotizadorService);
  productos: ProductoB2b[] = [];
  productoId: number | null = null;
  cantidad = 3;
  items: ItemCotizacionB2b[] = [];
  respuesta: ResultadoCotizacionB2b | null = null;
  cargandoProductos = false;
  calculando = false;
  error = '';

  ngOnInit(): void {
    this.cargandoProductos = true;
    this.b2b.listarProductos().subscribe({
      next: datos => {
        this.productos = (Array.isArray(datos) ? datos : []).filter(p => p.estado);
        this.cargandoProductos = false;
      },
      error: e => {
        this.cargandoProductos = false;
        this.error = `No se pudieron cargar los productos (HTTP ${e.status ?? 0}).`;
      }
    });
  }

  agregar(): void {
    const id = Number(this.productoId);
    const unidades = Number(this.cantidad);
    if (!Number.isInteger(id) || !this.productos.some(p => p.idProducto === id)
        || !Number.isInteger(unidades) || unidades < 1 || unidades > 10000) {
      this.error = 'Selecciona un producto activo y una cantidad entera de 1 a 10000.';
      return;
    }
    this.error = '';
    const actual = this.items.find(item => item.idProducto === id);
    if (actual) {
      if (actual.cantidad + unidades > 10000) {
        this.error = 'El máximo por producto en esta prueba es 10000 unidades.';
        return;
      }
      actual.cantidad += unidades;
    } else {
      this.items.push({ idProducto: id, cantidad: unidades });
    }
    this.respuesta = null;
  }

  quitar(id: number): void {
    this.items = this.items.filter(item => item.idProducto !== id);
    this.respuesta = null;
  }

  nombre(id: number): string {
    return this.productos.find(p => p.idProducto === id)?.nombre ?? `Producto ${id}`;
  }

  cotizar(): void {
    if (!this.items.length || this.calculando) return;
    this.error = '';
    this.calculando = true;
    this.respuesta = null;
    this.cotizador.cotizar(this.items).subscribe({
      next: respuesta => { this.respuesta = respuesta; this.calculando = false; },
      error: e => {
        this.calculando = false;
        const mensaje = typeof e.error?.message === 'string' ? e.error.message : '';
        this.error = `No se pudo cotizar (HTTP ${e.status ?? 0}). ${mensaje}`;
      }
    });
  }
}
