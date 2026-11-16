import { Component, OnInit, inject, signal } from '@angular/core';
import { TiendaService } from './core/services/tienda.service';

@Component({
  selector: 'app-demo-preview',
  standalone: true,
  templateUrl: './demo-preview.html',
  styleUrl: './demo-preview.css'
})
export class DemoPreview implements OnInit {
  private readonly tiendaService = inject(TiendaService);

  readonly nombreTienda = signal('SEBAS COLLECTION');
  readonly conexion = signal<'cargando' | 'conectado' | 'error'>('cargando');

  ngOnInit(): void {
    this.tiendaService.cargarConfiguracion().subscribe({
      next: tienda => {
        this.nombreTienda.set(tienda.nombre);
        this.conexion.set('conectado');
      },
      error: error => {
        console.error('Error de conexión con la boutique:', error);
        this.conexion.set('error');
      }
    });
  }

  readonly productos = [
    {
      nombre: 'Casaca urbana',
      tipo: 'Colección unisex',
      precio: 'S/ 149',
      imagen: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=700&auto=format&fit=crop'
    },
    {
      nombre: 'Camisa casual',
      tipo: 'Estilo contemporáneo',
      precio: 'S/ 89',
      imagen: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=700&auto=format&fit=crop'
    },
    {
      nombre: 'Moda esencial',
      tipo: 'Nueva temporada',
      precio: 'S/ 119',
      imagen: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&auto=format&fit=crop'
    },
    {
      nombre: 'Estilo de temporada',
      tipo: 'Colección boutique',
      precio: 'S/ 129',
      imagen: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700&auto=format&fit=crop'
    }
  ];
}