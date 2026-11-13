import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ColorTienda, VarianteAdmin, TipoVariantes } from '../../../core/services/variantes-admin.service';

interface TallaOpcion { idTalla: number; nombreTalla: string; estado: boolean; }
interface Celda { idColor: number | null; idTalla: number | null; stock: number; existe: boolean; nombreColor: string; nombreTalla: string; }
interface ResultadoLote { creadas: number; yaExistentes: number; idsCreados: number[]; }

@Component({
  selector: 'app-variantes-matriz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './variantes-matriz.html',
  styleUrl: './variantes-matriz.css'
})
export class VariantesMatriz {
  @Input({ required: true }) idProducto!: number;
  @Input({ required: true }) tipo!: TipoVariantes;
  @Input() sistema = 'SIN_TALLA';
  @Input() colores: ColorTienda[] = [];
  @Input() tallas: TallaOpcion[] = [];
  @Input() variantes: VarianteAdmin[] = [];
  @Output() guardado = new EventEmitter<void>();

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  coloresElegidos: number[] = [];
  tallasElegidas: number[] = [];
  cantidades: Record<string, number> = {};
  stockGeneral = 0;
  guardando = false;
  mensaje = '';
  error = '';

  get requiereColor(): boolean { return this.tipo === 'SOLO_COLOR' || this.tipo === 'COLOR_Y_TALLA'; }
  get requiereTalla(): boolean { return this.tipo === 'SOLO_TALLA' || this.tipo === 'COLOR_Y_TALLA'; }
  get coloresVisibles(): ColorTienda[] { return this.colores.filter(c => c.activo); }
  get tallasVisibles(): TallaOpcion[] { return this.tallas.filter(t => t.estado); }
  get elegidosColor(): ColorTienda[] { return this.coloresVisibles.filter(c => this.coloresElegidos.includes(c.idColor)); }
  get elegidosTalla(): TallaOpcion[] { return this.tallasVisibles.filter(t => this.tallasElegidas.includes(t.idTalla)); }

  get tallasDelSistema(): TallaOpcion[] {
    const grupo: Record<string, RegExp> = {
      LETRAS: /^(XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|3XL|4XL|5XL)$/i,
      CINTURA: /^(2[4-9]|3[0-9]|4[0-9]|50)$/,
      CUELLO: /^(1[4-9](\.5)?|20)$/,
      CALZADO: /^([1-4][0-9]|50)$/,
      MUJER_NUMERICA: /^(2|4|6|8|10|12|14|16|18|20|22|24)$/,
      TRAJES: /^(3[4-9]|4[0-9]|5[0-9])(R|S|L)?$/i
    };
    const patron = grupo[this.sistema];
    return patron ? this.tallasVisibles.filter(t => patron.test(t.nombreTalla.trim())) : this.tallasVisibles;
  }

  alternarColor(id: number): void {
    this.coloresElegidos = this.coloresElegidos.includes(id)
      ? this.coloresElegidos.filter(x => x !== id) : [...this.coloresElegidos, id];
    this.error = ''; this.mensaje = '';
  }
  alternarTalla(id: number): void {
    this.tallasElegidas = this.tallasElegidas.includes(id)
      ? this.tallasElegidas.filter(x => x !== id) : [...this.tallasElegidas, id];
    this.error = ''; this.mensaje = '';
  }
  clave(idColor: number | null, idTalla: number | null): string { return `${idColor ?? '-'}:${idTalla ?? '-'}`; }
  existente(idColor: number | null, idTalla: number | null): VarianteAdmin | undefined {
    return this.variantes.find(v => (v.idColor ?? null) === idColor && (v.idTalla ?? null) === idTalla);
  }
  stockCelda(idColor: number | null, idTalla: number | null): number {
    const k = this.clave(idColor, idTalla);
    return this.cantidades[k] ?? this.stockGeneral;
  }
  cambiarStock(idColor: number | null, idTalla: number | null, valor: number): void {
    this.cantidades[this.clave(idColor, idTalla)] = valor;
  }
  aplicarGeneral(): void {
    this.error = ''; this.mensaje = '';
    if (!Number.isInteger(this.stockGeneral) || this.stockGeneral < 0) {
      this.error = 'El stock general debe ser entero y no negativo.';
      return;
    }
    this.cantidades = {};
  }
  get filas(): Celda[] {
    const colores = this.requiereColor ? this.elegidosColor : [null];
    const tallas = this.requiereTalla ? this.elegidosTalla : [null];
    const resultado: Celda[] = [];
    for (const color of colores) for (const talla of tallas) {
      const idColor = color?.idColor ?? null;
      const idTalla = talla?.idTalla ?? null;
      const existente = this.existente(idColor, idTalla);
      resultado.push({ idColor, idTalla, existe: !!existente,
        nombreColor: color?.nombre ?? 'Sin color', nombreTalla: talla?.nombreTalla ?? 'Sin talla',
        stock: existente ? existente.stock : this.stockCelda(idColor, idTalla) });
    }
    return resultado;
  }
  get nuevas(): Celda[] { return this.filas.filter(f => !f.existe); }
  get stockNuevo(): number { return this.nuevas.reduce((s, f) => s + (Number.isInteger(f.stock) && f.stock >= 0 ? f.stock : 0), 0); }

  guardarLote(): void {
    this.error = ''; this.mensaje = '';
    if (this.guardando) return;
    const nuevas = this.nuevas;
    if (nuevas.length === 0) { this.error = 'Selecciona colores y tallas con combinaciones nuevas.'; return; }
    if (nuevas.length > 300) { this.error = 'Maximo 300 combinaciones por guardado.'; return; }
    if (nuevas.some(x => !Number.isInteger(x.stock) || x.stock < 0 || x.stock > 1000000)) {
      this.error = 'Cada stock debe ser un entero entre 0 y 1000000.'; return;
    }
    this.guardando = true;
    this.http.post<ResultadoLote>(`${environment.apiUrl}/api/v1/tiendas/admin/variantes/lote`, {
      idProducto: this.idProducto,
      combinaciones: nuevas.map(x => ({ idColor: x.idColor, idTalla: x.idTalla, stock: x.stock }))
    }).subscribe({
      next: res => {
        this.guardando = false;
        this.mensaje = `${res.creadas} combinaciones creadas; ${res.yaExistentes} ya existian. No se modifico stock anterior.`;
        this.guardado.emit();
        this.cdr.markForCheck();
      },
      error: e => {
        this.guardando = false;
        this.error = e.error?.detail || e.error?.message || `No se pudo guardar el lote (HTTP ${e.status || 0}).`;
        this.cdr.markForCheck();
      }
    });
  }
}
