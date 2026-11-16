
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TiendaService } from './core/services/tienda.service';
import { environment } from '../environments/environment';

interface ProductoApi {
  idProducto: number;
  nombre: string;
  precio: number;
  precioOferta?: number | null;
  imagen?: string | null;
  tiendaId: number;
  categoria?: {
    nombreCategoria: string;
  } | null;
}

interface ProductoVista {
  id: number;
  nombre: string;
  tipo: string;
  precio: string;
  imagen: string | null;
}

@Component({
  selector: 'app-demo-preview',
  standalone: true,
  templateUrl: './demo-preview.html',
  styleUrl: './demo-preview.css'
})
export class DemoPreview implements OnInit {

  private readonly http = inject(HttpClient);
  private readonly tiendaService = inject(TiendaService);

  private readonly api = environment.apiUrl;

  readonly nombreTienda = signal('SEBAS COLLECTION');

  readonly conexion = signal<
    'cargando' | 'conectado' | 'error'
  >('cargando');

  readonly estadoCatalogo = signal<
    'cargando' | 'listo' | 'error'
  >('cargando');

  readonly productos = signal<ProductoVista[]>([]);

  ngOnInit(): void {
    this.cargarTienda();
    this.cargarProductos();
  }

  private cargarTienda(): void {
    this.tiendaService.cargarConfiguracion().subscribe({
      next: tienda => {
        this.nombreTienda.set(tienda.nombre);
        this.conexion.set('conectado');
      },
      error: error => {
        console.error('Error cargando tienda:', error);
        this.conexion.set('error');
      }
    });
  }

  private cargarProductos(): void {
    this.estadoCatalogo.set('cargando');

    this.http.get<ProductoApi[]>(
      `${this.api}/api/productos/public`
    ).subscribe({
      next: respuesta => {

        if (!Array.isArray(respuesta)) {
          this.estadoCatalogo.set('error');
          return;
        }

        const tiendaId = this.tiendaService.tiendaActual()?.id;

        // El backend y RLS deben aplicar el aislamiento real.
        // Este filtro adicional es solamente defensivo.
        const productos = respuesta
          .filter(p =>
            p.idProducto > 0 &&
            p.tiendaId > 0 &&
            (tiendaId == null || p.tiendaId === tiendaId)
          )
          .map(p => this.convertirProducto(p));

        this.productos.set(productos);
        this.estadoCatalogo.set('listo');
      },

      error: error => {
        console.error('Error cargando catálogo:', error);
        this.productos.set([]);
        this.estadoCatalogo.set('error');
      }
    });
  }

  private convertirProducto(p: ProductoApi): ProductoVista {
    const precioFinal = p.precioOferta ?? p.precio;

    return {
      id: p.idProducto,
      nombre: p.nombre,
      tipo: p.categoria?.nombreCategoria ?? 'Colección',
      precio: new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
      }).format(Number(precioFinal)),
      imagen: this.resolverImagen(p.imagen)
    };
  }

  private resolverImagen(imagen?: string | null): string | null {
    if (!imagen) {
      return null;
    }

    if (/^https:\/\//i.test(imagen)) {
      return imagen;
    }

    if (imagen.startsWith('/uploads/')) {
      return `${this.api}${imagen}`;
    }

    return null;
  }
}
