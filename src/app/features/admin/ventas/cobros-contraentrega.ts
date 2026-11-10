import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CobroContraEntrega, ContraEntregaService } from '../../../core/services/contraentrega';

@Component({
  selector: 'app-cobros-contraentrega',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cobros-contraentrega.html',
  styleUrl: './cobros-contraentrega.css'
})
export class CobrosContraEntrega implements OnInit {
  private readonly api = inject(ContraEntregaService);
  private readonly cdr = inject(ChangeDetectorRef);
  cobros: CobroContraEntrega[] = [];
  elegido: number | null = null;
  metodo: 'EFECTIVO' | 'YAPE' = 'EFECTIVO';
  referencia = '';
  confirmarDinero = false;
  motivoCancelacion = '';
  aceptoCancelacion = false;
  cancelando = false;
  cargando = false;
  guardando = false;
  mensaje = '';
  error = '';

  ngOnInit(): void { this.recargar(); }

  recargar(): void {
    this.cargando = true;
    this.error = '';
    this.api.listar().subscribe({
      next: c => {
        this.cobros = c ?? [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        this.error = `No se pueden consultar cobros (HTTP ${e.status}).`;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionar(id: number): void {
    this.elegido = id;
    this.confirmarDinero = false;
    this.motivoCancelacion = '';
    this.aceptoCancelacion = false;
    this.referencia = '';
    this.metodo = 'EFECTIVO';
    this.error = '';
    this.mensaje = '';
  }

  get seleccionado(): CobroContraEntrega | undefined {
    return this.cobros.find(c => c.idVenta === this.elegido);
  }

  get puedeCobrar(): boolean {
    const c = this.seleccionado;
    return !!c && c.estado === 'PENDIENTE' &&
      ['DESPACHADO', 'EN_TRANSITO', 'ENTREGADO'].includes(c.estadoEnvio) &&
      this.confirmarDinero && !this.guardando &&
      (this.metodo !== 'YAPE' || this.referencia.trim().length >= 4);
  }

  get puedeCancelar(): boolean {
    const c = this.seleccionado;
    return !!c && c.estado === 'PENDIENTE' &&
      ['PENDIENTE','PREPARANDO'].includes(c.estadoEnvio) &&
      this.motivoCancelacion.trim().length >= 10 &&
      this.motivoCancelacion.trim().length <= 300 &&
      this.aceptoCancelacion && !this.cancelando && !this.guardando;
  }

  cancelarPedido(): void {
    if (!this.puedeCancelar || !this.elegido) return;
    const id = this.elegido;
    this.cancelando = true;
    this.error = '';
    this.api.cancelar(id, this.motivoCancelacion.trim()).subscribe({
      next: r => {
        this.cancelando = false;
        this.mensaje = `Pedido #${id} cancelado; ${r.unidadesRepuestas} unidades repuestas una sola vez.`;
        this.aceptoCancelacion = false;
        this.motivoCancelacion = '';
        this.recargar();
      },
      error: (e: HttpErrorResponse) => {
        this.cancelando = false;
        this.error = `No se cancelo el pedido (HTTP ${e.status}). Verifica que no este despachado ni cobrado.`;
        this.cdr.detectChanges();
      }
    });
  }

  cobrar(): void {
    if (!this.puedeCobrar || !this.elegido) return;
    this.guardando = true;
    this.error = '';
    this.api.confirmar(this.elegido, this.metodo, this.referencia.trim()).subscribe({
      next: () => {
        this.guardando = false;
        this.mensaje = `Cobro del pedido #${this.elegido} registrado como recibido.`;
        this.confirmarDinero = false;
        this.recargar();
      },
      error: (e: HttpErrorResponse) => {
        this.guardando = false;
        this.error = `No se registro el cobro (HTTP ${e.status}): ${e.error?.message || 'verifica el estado del reparto'}`;
        this.cdr.detectChanges();
      }
    });
  }
}
