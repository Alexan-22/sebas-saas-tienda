
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { Producto } from '../../../core/models/producto';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink
  ],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css'
})
export class ProductCard implements OnChanges {

  @Input({ required: true })
  producto!: Producto;

  // Permite priorizar imágenes visibles al abrir la página.
  @Input()
  prioritaria = false;

  imagenError = false;

  private readonly uploadsUrl =
    `${environment.apiUrl}/uploads/`;

  private urlImagen: string | null = null;

  // Actualizar correctamente cuando cambia el producto.
  ngOnChanges(changes: SimpleChanges): void {

    if (changes['producto']) {

      this.imagenError = false;

      this.urlImagen = this.resolverImagen(
        this.producto?.imagen
      );

    }
  }

  get imagenUrl(): string | null {

    if (this.imagenError) {
      return null;
    }

    return this.urlImagen;
  }

  private resolverImagen(
    imagen: string | null | undefined
  ): string | null {

    if (!imagen?.trim()) {
      return null;
    }

    const ruta = imagen.trim();

    // URL externa o Supabase Storage.
    if (/^https?:\/\//i.test(ruta)) {
      return ruta;
    }

    const rutaLimpia = ruta
      .replace(/^\/+/, '')
      .replace(/^uploads\//, '')
      .replace(/^productos\//, '');

    return this.uploadsUrl + rutaLimpia;
  }

  onImagenError(): void {
    this.imagenError = true;
  }

  get tieneOferta(): boolean {

    const oferta = Number(
      this.producto?.precioOferta
    );

    const precio = Number(
      this.producto?.precio
    );

    return (
      Number.isFinite(oferta) &&
      Number.isFinite(precio) &&
      oferta > 0 &&
      oferta < precio
    );
  }

  get porcentajeDescuento(): number {

    if (!this.tieneOferta) {
      return 0;
    }

    const precio = Number(
      this.producto.precio
    );

    const oferta = Number(
      this.producto.precioOferta
    );

    return Math.round(
      (1 - oferta / precio) * 100
    );
  }
}
