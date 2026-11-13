import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CabeceraConfig, CabeceraTiendaService, MenuCabecera, intervaloPromo, duracionDesplazamiento, textoContraste
} from '../../../core/services/cabecera-tienda.service';
import { EditorTiendaService } from '../../../core/services/editor-tienda.service';
import { TiendaService } from '../../../core/services/tienda.service';

@Component({
  selector: 'app-personalizacion-cabecera', standalone: true, imports: [FormsModule],
  templateUrl: './personalizacion-cabecera.html',
  styleUrl: './personalizacion-cabecera.css'
})
export class PersonalizacionCabecera implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  readonly service = inject(CabeceraTiendaService);
  readonly tienda = inject(TiendaService);
  private readonly editor = inject(EditorTiendaService);
  private revision: number | null = null;
  private guardado?: CabeceraConfig;
  formulario: CabeceraConfig = structuredClone(this.service.cabecera());
  cargando = true;
  guardando = false;
  error = '';
  exito = '';
  indiceVista = 0;

  ngOnInit(): void {
    this.editor.obtener().subscribe({
      next: borrador => {
        this.revision = borrador.revision;
        this.guardado = borrador.contenido.cabecera;
        this.formulario = structuredClone(this.guardado);
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: e => { this.cargando = false; this.error = `No se pudo consultar la cabecera (HTTP ${e.status}).`; this.cdr.markForCheck(); }
    });
  }
  get color(): string { return this.tienda.tiendaActual()?.colorPrimario || '#171717'; }
  get contraste(): string { return textoContraste(this.color); }
  get nombre(): string { return this.tienda.tiendaActual()?.nombre || 'Mi tienda'; }
  get duracion(): string { return this.formulario.promoVelocidad === 'ESTATICA' ? 'Sin movimiento' : (this.formulario.promoModo === 'DESPLAZAMIENTO' ? `${duracionDesplazamiento(this.formulario.promoVelocidad)} segundos por recorrido` : `${intervaloPromo(this.formulario.promoVelocidad) / 1000} segundos por mensaje`); }
  get duracionDesplazamientoVista(): number { return duracionDesplazamiento(this.formulario.promoVelocidad); }
  get mensajeVista(): string {
    const mensajes = this.formulario.promoMensajes;
    return mensajes.length ? mensajes[this.indiceVista % mensajes.length] : '';
  }
  agregarMensaje(): void {
    if (this.formulario.promoMensajes.length < 5) this.formulario.promoMensajes.push('');
  }
  quitarMensaje(i: number): void {
    if (this.formulario.promoMensajes.length > 1) this.formulario.promoMensajes.splice(i, 1);
    this.indiceVista = 0;
  }
  mover(i: number, direccion: -1 | 1): void {
    const destino = i + direccion;
    if (destino < 0 || destino >= this.formulario.menuItems.length) return;
    const lista = this.formulario.menuItems;
    [lista[i], lista[destino]] = [lista[destino], lista[i]];
  }
  siguiente(): void {
    const n = this.formulario.promoMensajes.length;
    if (n) this.indiceVista = (this.indiceVista + 1) % n;
  }
  anterior(): void {
    const n = this.formulario.promoMensajes.length;
    if (n) this.indiceVista = (this.indiceVista + n - 1) % n;
  }
  restaurar(): void {
    if (this.guardado) this.formulario = structuredClone(this.guardado);
    this.indiceVista = 0;
    this.error = '';
    this.exito = '';
  }
  agregarSubmenu(item: MenuCabecera): void {
    item.submenus ??= [];
    if (item.submenus.length < 8) item.submenus.push({ texto: '', busqueda: '' });
  }

  guardar(): void {
    this.error = ''; this.exito = '';
    const mensajes = this.formulario.promoMensajes.map(m => m.trim());
    if (mensajes.some(m => !m || m.length > 120) || mensajes.length < 1 || mensajes.length > 5) {
      this.error = 'Debes configurar entre 1 y 5 mensajes, cada uno de 1 a 120 caracteres.'; return;
    }
    if (this.formulario.menuItems.some(m => !m.texto.trim() || m.texto.trim().length > 24)) {
      this.error = 'Cada enlace debe tener un nombre de 1 a 24 caracteres.'; return;
    }
    if (this.formulario.menuItems.some(item => item.submenus?.some(sub => !sub.texto.trim() || !sub.busqueda.trim()))) {
      this.error = 'Completa el nombre y la búsqueda de cada submenú.';
      return;
    }
    if (this.guardando || this.cargando || this.revision === null) return;
    this.guardando = true;
    const datos: CabeceraConfig = {
      ...this.formulario,
      promoMensajes: mensajes,
      menuItems: this.formulario.menuItems.map(m => ({ ...m, texto: m.texto.trim() }))
    };
    this.editor.guardar('cabecera', this.revision, datos).subscribe({
      next: borrador => {
        this.revision = borrador.revision;
        this.guardado = borrador.contenido.cabecera;
        this.formulario = structuredClone(this.guardado);
        this.guardando = false;
        this.exito = 'Borrador guardado. Publícalo desde el Editor de tienda.';
      },
      error: e => {
        this.guardando = false;
        this.error = e.status === 409 ? 'El borrador cambió. Recarga esta página.' : e.error?.message || `No se pudo guardar (HTTP ${e.status}).`;
      }
    });
  }
}
