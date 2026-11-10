import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Producto } from '../../../core/models/producto';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css'
})
export class ProductCard {
  @Input({ required: true }) producto!: Producto;
  imagenError = false;
  private readonly uploadsUrl = `${environment.apiUrl}/uploads/`;

  get imagenUrl(): string | null {
    if (!this.producto?.imagen || this.imagenError) return null;
    const ruta = this.producto.imagen.trim();
    if (/^https?:\/\//i.test(ruta)) return ruta;
    return this.uploadsUrl + ruta.replace(/^\/+/, '').replace(/^uploads\//, '').replace(/^productos\//, '');
  }
  onImagenError(): void { this.imagenError = true; }

  get tieneOferta(): boolean {
    const oferta = Number(this.producto?.precioOferta);
    const precio = Number(this.producto?.precio);
    return Number.isFinite(oferta) && oferta > 0 && oferta < precio;
  }
  get porcentajeDescuento(): number {
    if (!this.tieneOferta) return 0;
    return Math.round((1 - Number(this.producto.precioOferta) / Number(this.producto.precio)) * 100);
  }
}
