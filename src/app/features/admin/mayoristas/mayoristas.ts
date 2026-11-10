import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { B2bSimulador } from './b2b-simulador';
import { B2bService, ConfigB2b, EscalaB2b, ProductoB2b } from '../../../core/services/b2b';

@Component({
  selector: 'app-mayoristas', standalone: true,
  imports: [CommonModule, FormsModule, B2bSimulador],
  templateUrl: './mayoristas.html', styleUrl: './mayoristas.css'
})
export class Mayoristas implements OnInit {
  private readonly api = inject(B2bService);
  config: ConfigB2b = { habilitado: false, minimoPrendas: 0, minimoMonto: 0 };
  productos: ProductoB2b[] = [];
  productoId: number | null = null;
  escalas: EscalaB2b[] = [];
  cargando = true;
  guardandoConfig = false;
  guardandoEscalas = false;
  error = '';
  mensaje = '';

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true; this.error = ''; this.mensaje = '';
    this.api.obtenerConfig().subscribe({
      next: c => { this.config = c; this.cargando = false; this.cargarProductos(); },
      error: e => { this.cargando = false; this.error = `Configuración: HTTP ${e.status ?? 0}. Comprueba el SQL y Spring Boot.`; }
    });
  }

  cargarProductos(): void {
    this.api.listarProductos().subscribe({
      next: r => { this.productos = Array.isArray(r) ? r : []; },
      error: e => { this.error = `No se pudo listar productos administrativos (HTTP ${e.status ?? 0}).`; }
    });
  }

  seleccionarProducto(): void {
    this.error = ''; this.mensaje = ''; this.escalas = [];
    if (!this.productoId) return;
    this.api.listarEscalas(this.productoId).subscribe({
      next: r => { this.escalas = r; },
      error: e => { this.error = `Escalas: HTTP ${e.status ?? 0}`; }
    });
  }

  agregarEscala(): void {
    this.escalas.push({ cantidadMinima: this.escalas.length ? Math.max(...this.escalas.map(x => x.cantidadMinima)) + 1 : 3, precioUnitario: 0 });
  }
  quitarEscala(i: number): void { this.escalas.splice(i, 1); }

  guardarConfig(): void {
    this.error = ''; this.mensaje = ''; this.guardandoConfig = true;
    this.api.guardarConfig(this.config).subscribe({
      next: c => { this.config = c; this.guardandoConfig = false; this.mensaje = 'Configuración guardada para esta tienda.'; },
      error: e => { this.guardandoConfig = false; this.error = `No se guardó la configuración (HTTP ${e.status ?? 0}).`; }
    });
  }

  guardarEscalas(): void {
    if (!this.productoId) return;
    this.error = ''; this.mensaje = ''; this.guardandoEscalas = true;
    this.api.guardarEscalas(this.productoId, this.escalas).subscribe({
      next: r => { this.escalas = r; this.guardandoEscalas = false; this.mensaje = 'Escalas guardadas correctamente.'; },
      error: e => { this.guardandoEscalas = false; this.error = `No se guardaron escalas (HTTP ${e.status ?? 0}). Revisa precios y cantidades.`; }
    });
  }
  get productoActual(): ProductoB2b | undefined {
    return this.productos.find(p => p.idProducto === this.productoId);
  }
}
