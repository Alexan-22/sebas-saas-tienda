import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CabeceraConfig, CabeceraTiendaService, intervaloPromo, duracionDesplazamiento, textoContraste
} from '../../../core/services/cabecera-tienda.service';
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
  formulario: CabeceraConfig = structuredClone(this.service.cabecera());
  cargando = true;
  guardando = false;
  error = '';
  exito = '';
  indiceVista = 0;

  ngOnInit(): void {
    this.service.consultarAdmin().subscribe({
      next: datos => { this.formulario = structuredClone(datos); this.cargando = false; this.cdr.markForCheck(); },
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
    this.formulario = structuredClone(this.service.cabecera());
    this.indiceVista = 0;
    this.error = '';
    this.exito = '';
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
    if (this.guardando || this.cargando) return;
    this.guardando = true;
    const datos: CabeceraConfig = {
      ...this.formulario,
      promoMensajes: mensajes,
      menuItems: this.formulario.menuItems.map(m => ({ ...m, texto: m.texto.trim() }))
    };
    this.service.guardar(datos).subscribe({
      next: guardado => {
        this.formulario = structuredClone(guardado);
        this.guardando = false;
        this.exito = 'Cabecera guardada. La tienda pública mostrará los cambios.';
      },
      error: e => {
        this.guardando = false;
        this.error = e.error?.message || `No se pudo guardar (HTTP ${e.status}).`;
      }
    });
  }
}
