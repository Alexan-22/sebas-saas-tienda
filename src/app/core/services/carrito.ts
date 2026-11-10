import { Injectable, computed, signal } from '@angular/core';
import { CarritoItem } from '../models/carrito-item';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private readonly storageKey = 'tienda-sebas-carrito';

  private readonly itemsSignal = signal<CarritoItem[]>(
    this.cargarStorage()
  );

  readonly items = this.itemsSignal.asReadonly();

  readonly cantidadTotal = computed(() =>
    this.itemsSignal().reduce(
      (total, item) => total + item.cantidad,
      0
    )
  );

  readonly subtotal = computed(() =>
    this.itemsSignal().reduce(
      (total, item) => total + (item.precio * item.cantidad),
      0
    )
  );

  agregar(item: CarritoItem): void {
    const items = [...this.itemsSignal()];

    const indice = items.findIndex(
      actual => actual.idProductoTalla === item.idProductoTalla
    );

    if (indice >= 0) {
      const cantidadNueva = items[indice].cantidad + item.cantidad;

      items[indice] = {
        ...items[indice],
        stock: item.stock,
        cantidad: Math.min(cantidadNueva, item.stock)
      };
    } else {
      if (item.stock <= 0) {
        return;
      }

      items.push({
        ...item,
        cantidad: Math.max(
          1,
          Math.min(item.cantidad, item.stock)
        )
      });
    }

    this.actualizar(items);
  }

  cambiarCantidad(idProductoTalla: number, cantidad: number): void {
    const items = this.itemsSignal().map(item => {
      if (item.idProductoTalla !== idProductoTalla) {
        return item;
      }

      if (item.stock <= 0) {
        return item;
      }

      return {
        ...item,
        cantidad: Math.max(
          1,
          Math.min(cantidad, item.stock)
        )
      };
    });

    this.actualizar(items);
  }

  actualizarStock(idProductoTalla: number, stock: number): void {
    const stockSeguro = Math.max(0, stock);

    const items = this.itemsSignal().map(item => {
      if (item.idProductoTalla !== idProductoTalla) {
        return item;
      }

      return {
        ...item,
        stock: stockSeguro,
        cantidad:
          stockSeguro > 0
            ? Math.min(item.cantidad, stockSeguro)
            : item.cantidad
      };
    });

    this.actualizar(items);
  }

  eliminar(idProductoTalla: number): void {
    const items = this.itemsSignal().filter(
      item => item.idProductoTalla !== idProductoTalla
    );

    this.actualizar(items);
  }

  vaciar(): void {
    this.actualizar([]);
  }

  private actualizar(items: CarritoItem[]): void {
    this.itemsSignal.set(items);

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(items)
    );
  }

  private cargarStorage(): CarritoItem[] {
    try {
      const data = localStorage.getItem(this.storageKey);

      if (!data) {
        return [];
      }

      const parsed: CarritoItem[] = JSON.parse(data);

      return parsed;
    } catch (error) {
      console.error(
        'Error leyendo el carrito:',
        error
      );

      return [];
    }
  }
}