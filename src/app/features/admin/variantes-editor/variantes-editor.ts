import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { VariantesMatriz } from './variantes-matriz';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ColorTienda, ConfiguracionVariantes, TipoVariantes,
  VarianteAdmin, VariantesAdminService
} from '../../../core/services/variantes-admin.service';

interface TallaOpcion { idTalla: number; nombreTalla: string; estado: boolean; }

@Component({
  selector: 'app-variantes-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, VariantesMatriz],
  templateUrl: './variantes-editor.html',
  styleUrl: './variantes-editor.css'
})
export class VariantesEditor implements OnInit, OnChanges {
  @Input({ required: true }) idProducto!: number;
  @Input() tipoActual: string | null = null;
  @Input() sistemaActual: string | null = null;

  private readonly http = inject(HttpClient);
  private readonly api = inject(VariantesAdminService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly opcionesTipo: Array<{ value: TipoVariantes; label: string }> = [
    { value: 'SIN_VARIANTES', label: 'Sin color ni talla' },
    { value: 'SOLO_COLOR', label: 'Solo color' },
    { value: 'SOLO_TALLA', label: 'Solo talla' },
    { value: 'COLOR_Y_TALLA', label: 'Color y talla' }
  ];
  readonly opcionesSistema = [
    'LETRAS', 'CINTURA', 'CUELLO', 'TRAJES', 'CALZADO',
    'MUJER_NUMERICA', 'LENCERIA', 'BEBES', 'INFANTIL',
    'HOGAR', 'PERSONALIZADO'
  ];

  tipo: TipoVariantes = 'SIN_VARIANTES';
  sistema = 'SIN_TALLA';
  configurado = false;
  configurando = false;
  cargando = true;
  guardando = false;
  creandoColor = false;
  error = '';
  exito = '';

  colores: ColorTienda[] = [];
  tallas: TallaOpcion[] = [];
  variantes: VarianteAdmin[] = [];
  idColor: number | null = null;
  idTalla: number | null = null;
  stock = 0;
  nuevoNombreColor = '';
  nuevoHexColor = '#222222';

  get necesitaColor(): boolean {
    return this.tipo === 'SOLO_COLOR' || this.tipo === 'COLOR_Y_TALLA';
  }
  get necesitaTalla(): boolean {
    return this.tipo === 'SOLO_TALLA' || this.tipo === 'COLOR_Y_TALLA';
  }
  get conInventario(): boolean { return this.variantes.length > 0; }
  get coloresActivos(): ColorTienda[] { return this.colores.filter(c => c.activo); }
  get tallasActivas(): TallaOpcion[] { return this.tallas.filter(t => t.estado); }
  get stockTotal(): number { return this.variantes.reduce((s, v) => s + v.stock, 0); }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['tipoActual'] || changes['sistemaActual']) && !this.configurando && !this.configurado) {
      if (this.tipoActual && this.opcionesTipo.some(o => o.value === this.tipoActual)) {
        this.tipo = this.tipoActual as TipoVariantes;
        this.configurado = true;
      }
      if (this.sistemaActual) this.sistema = this.sistemaActual;
    }
  }

  ngOnInit(): void {
    if (this.tipoActual && this.opcionesTipo.some(o => o.value === this.tipoActual)) {
      this.tipo = this.tipoActual as TipoVariantes;
      this.configurado = true;
    }
    if (this.sistemaActual) this.sistema = this.sistemaActual;
    this.recargar();
  }

  recargar(): void {
    if (!Number.isInteger(this.idProducto) || this.idProducto < 1) return;
    this.cargando = true;
    forkJoin({
      variantes: this.api.listarVariantes(this.idProducto),
      colores: this.api.listarColores(),
      tallas: this.http.get<TallaOpcion[]>(`${environment.apiUrl}/api/tallas`)
    }).subscribe({
      next: res => {
        this.variantes = res.variantes ?? [];
        this.colores = res.colores ?? [];
        this.tallas = res.tallas ?? [];
        this.cargarVisibilidadColores();
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: e => {
        this.error = `No se pudieron consultar las variantes (HTTP ${e.status || 0}).`;
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  colorQuitandoId: number | null = null;
  get coloresRegistrados(): Array<{ idColor: number; nombre: string; stock: number }> {
    const mapa = new Map<number, { idColor: number; nombre: string; stock: number }>();
    for (const v of this.variantes) {
      if (v.idColor == null) continue;
      const actual = mapa.get(v.idColor);
      if (actual) actual.stock += Number(v.stock ?? 0);
      else mapa.set(v.idColor, {
        idColor: v.idColor,
        nombre: this.colores.find(c => c.idColor === v.idColor)?.nombre ?? v.color ?? 'Color',
        stock: Number(v.stock ?? 0)
      });
    }
    return [...mapa.values()];
  }

  quitarColorProducto(color: { idColor: number; nombre: string; stock: number }): void {
    if (this.tipo !== 'COLOR_Y_TALLA' || this.colorQuitandoId !== null) return;
    if (color.stock !== 0) {
      this.error = 'No se puede quitar un color con stock. Utiliza el ajuste auditado de inventario.';
      return;
    }
    if (!window.confirm(`Quitar ${color.nombre} de este producto? Solo se permite sin stock, fotos ni movimientos historicos. No se borra el color de otras tiendas ni productos.`)) return;
    this.error = '';
    this.exito = '';
    this.colorQuitandoId = color.idColor;
    this.http.delete<{ variantesQuitadas: number; mensaje: string }>(
      `${environment.apiUrl}/api/v1/tiendas/admin/variantes/producto/${this.idProducto}/color/${color.idColor}`
    ).subscribe({
      next: resultado => {
        this.colorQuitandoId = null;
        this.exito = `${resultado.variantesQuitadas} combinaciones retiradas. El color sigue disponible para otros productos.`;
        this.recargar();
      },
      error: e => {
        this.colorQuitandoId = null;
        this.error = e.error?.detail || e.error?.message || `No se pudo quitar el color (HTTP ${e.status || 0}). Revisa stock, fotos y movimientos.`;
        this.cdr.markForCheck();
      }
    });
  }

  visibilidadColores: Array<{idColor:number;nombre:string;codigoHex:string;stock:number;oculto:boolean}> = [];
  cambiandoVisibilidadId: number | null = null;

  cargarVisibilidadColores(): void {
    if (this.tipo !== 'COLOR_Y_TALLA' || !this.configurado) {
      this.visibilidadColores = [];
      return;
    }
    this.http.get<Array<{idColor:number;nombre:string;codigoHex:string;stock:number;oculto:boolean}>>(
      `${environment.apiUrl}/api/v1/tiendas/admin/visibilidad-colores/producto/${this.idProducto}`
    ).subscribe({
      next: datos => { this.visibilidadColores = datos ?? []; this.cdr.markForCheck(); },
      error: e => {
        this.error = `No se pudo cargar la visibilidad de colores (HTTP ${e.status || 0}).`;
        this.cdr.markForCheck();
      }
    });
  }

  cambiarVisibilidadColor(color: {idColor:number;nombre:string;oculto:boolean}): void {
    if (this.tipo !== 'COLOR_Y_TALLA' || this.cambiandoVisibilidadId !== null) return;
    const accion = color.oculto ? 'Mostrar' : 'Ocultar';
    if (!window.confirm(`${accion} ${color.nombre} SOLO en este producto? Se conserva stock, fotos e historial.`)) return;
    this.cambiandoVisibilidadId = color.idColor;
    this.error = ''; this.exito = '';
    const ruta = `${environment.apiUrl}/api/v1/tiendas/admin/visibilidad-colores/producto/${this.idProducto}/color/${color.idColor}/ocultar`;
    const peticion = color.oculto ? this.http.delete(ruta) : this.http.put(ruta, {});
    peticion.subscribe({
      next: () => {
        this.cambiandoVisibilidadId = null;
        this.exito = `${color.nombre}: ${color.oculto ? 'visible' : 'oculto'} en la tienda publica.`;
        this.cargarVisibilidadColores();
        this.cdr.markForCheck();
      },
      error: e => {
        this.cambiandoVisibilidadId = null;
        this.error = e.error?.detail || e.error?.message || `Error HTTP ${e.status || 0} al cambiar visibilidad.`;
        this.cdr.markForCheck();
      }
    });
  }
  guardarConfiguracion(): void {
    this.error = ''; this.exito = '';
    if (this.cargando || this.configurando || this.conInventario || this.configurado) return;
    const solicitud: ConfiguracionVariantes = {
      tipo: this.tipo,
      sistemaTallas: this.necesitaTalla ? this.sistema : 'SIN_TALLA'
    };
    this.configurando = true;
    this.api.configurar(this.idProducto, solicitud).subscribe({
      next: r => {
        this.tipo = r.tipo;
        this.sistema = r.sistemaTallas;
        this.configurado = true;
        this.configurando = false;
        this.exito = 'Modalidad guardada. Ahora puedes registrar las variantes.';
        this.cdr.markForCheck();
      },
      error: e => {
        this.error = e.error?.message || e.error?.detail || `No se pudo configurar (HTTP ${e.status}).`;
        this.configurando = false;
        this.cdr.markForCheck();
      }
    });
  }

  crearColor(): void {
    this.error = ''; this.exito = '';
    const nombre = this.nuevoNombreColor.trim();
    if (!nombre || nombre.length > 60 || !/^#[0-9a-fA-F]{6}$/.test(this.nuevoHexColor)) {
      this.error = 'Escribe un color válido y un hexadecimal de 6 dígitos.';
      return;
    }
    if (this.creandoColor) return;
    this.creandoColor = true;
    this.http.post<ColorTienda>(`${environment.apiUrl}/api/v1/tiendas/admin/colores`, {
      nombre,
      codigoHex: this.nuevoHexColor
    }).subscribe({
      next: nuevo => {
        this.colores = [...this.colores, nuevo];
        this.idColor = nuevo.idColor;
        this.nuevoNombreColor = '';
        this.creandoColor = false;
        this.exito = 'Color registrado en tu tienda.';
        this.cdr.markForCheck();
      },
      error: e => {
        this.creandoColor = false;
        this.error = e.error?.message || e.error?.detail || `No se pudo crear el color (HTTP ${e.status}).`;
        this.cdr.markForCheck();
      }
    });
  }

  crearVariante(): void {
    this.error = ''; this.exito = '';
    if (!this.configurado || this.guardando || this.cargando) return;
    if (!Number.isInteger(this.stock) || this.stock < 0) {
      this.error = 'El stock debe ser un número entero no negativo.';
      return;
    }
    if (this.necesitaColor && this.idColor == null) {
      this.error = 'Selecciona un color.';
      return;
    }
    if (this.necesitaTalla && this.idTalla == null) {
      this.error = 'Selecciona una talla.';
      return;
    }
    const idColor = this.necesitaColor ? this.idColor : null;
    const idTalla = this.necesitaTalla ? this.idTalla : null;
    if (this.variantes.some(v => v.idColor === idColor && v.idTalla === idTalla)) {
      this.error = 'Esta combinación ya existe.';
      return;
    }
    this.guardando = true;
    this.api.crearVariante({ idProducto: this.idProducto, idColor, idTalla, stock: this.stock }).subscribe({
      next: () => {
        this.guardando = false;
        this.exito = 'Variante registrada correctamente.';
        this.recargar();
      },
      error: e => {
        this.guardando = false;
        this.error = e.error?.message || e.error?.detail || `No se pudo registrar (HTTP ${e.status}).`;
        this.cdr.markForCheck();
      }
    });
  }
}
