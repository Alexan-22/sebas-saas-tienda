import { Component } from '@angular/core';

@Component({
  selector: 'app-demo-preview',
  standalone: true,
  templateUrl: './demo-preview.html',
  styleUrl: './demo-preview.css'
})
export class DemoPreview {
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