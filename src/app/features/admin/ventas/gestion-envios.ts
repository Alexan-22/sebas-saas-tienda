import { CobrosContraEntrega } from './cobros-contraentrega';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { EnviosService, Envio, EstadoEnvio, GuardarEnvio, VentaLogistica } from '../../../core/services/envios';

@Component({
  selector: 'app-gestion-envios',
  standalone: true,
  imports: [CommonModule, FormsModule, CobrosContraEntrega],
  templateUrl: './gestion-envios.html',
  styleUrl: './gestion-envios.css'
})
export class GestionEnvios implements OnInit {
  private readonly api = inject(EnviosService);
  private readonly cdr = inject(ChangeDetectorRef);

  ventas: VentaLogistica[] = [];
  envios: Envio[] = [];
  ventaId: number | null = null;
  actual: Envio | null = null;
  estadoNuevo: EstadoEnvio = 'PREPARANDO';
  formulario: GuardarEnvio = {
    operador: 'SHALOM', modalidad: 'AGENCIA', numeroGuia: '', codigoRastreo: '', observaciones: ''
  };
  cargando = false;
  guardando = false;
  mensaje = '';
  error = '';

  readonly transiciones: Record<EstadoEnvio, EstadoEnvio[]> = {
    PENDIENTE: ['PREPARANDO', 'CANCELADO'],
    PREPARANDO: ['DESPACHADO', 'CANCELADO'],
    DESPACHADO: ['EN_TRANSITO', 'DISPONIBLE_RETIRO', 'ENTREGADO', 'INCIDENCIA'],
    EN_TRANSITO: ['DISPONIBLE_RETIRO', 'ENTREGADO', 'INCIDENCIA'],
    DISPONIBLE_RETIRO: ['ENTREGADO', 'INCIDENCIA'],
    INCIDENCIA: ['PREPARANDO', 'DESPACHADO', 'EN_TRANSITO', 'ENTREGADO', 'CANCELADO'],
    ENTREGADO: [], CANCELADO: []
  };

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.api.ventas().subscribe({
      next: ventas => {
        this.ventas = ventas || [];
        if (this.ventaId !== null && !this.ventas.some(v => v.idVenta === this.ventaId)) {
          this.ventaId = null;
          this.actual = null;
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.error = this.mensajeError(e, 'No se pudieron consultar las ventas online');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
    this.refrescarEnvios();
  }

  refrescarEnvios(): void {
    this.api.listar().subscribe({
      next: envios => { this.envios = envios || []; this.cdr.detectChanges(); },
      error: (e: HttpErrorResponse) => {
        this.error = this.mensajeError(e, 'No se pudo consultar el seguimiento de envios');
        this.cdr.detectChanges();
      }
    });
  }

  seleccionar(): void {
    this.actual = null;
    this.mensaje = '';
    this.error = '';
    this.formulario = { operador: 'SHALOM', modalidad: 'AGENCIA', numeroGuia: '', codigoRastreo: '', observaciones: '' };
    if (!this.ventaId) return;
    this.api.obtener(this.ventaId).subscribe({
      next: envio => { this.mostrar(envio); this.cdr.detectChanges(); },
      error: (e: HttpErrorResponse) => {
        if (e.status !== 404) this.error = this.mensajeError(e, 'No se pudo leer la guia');
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarEnvio(envio: Envio): void {
    this.ventaId = envio.idVenta;
    this.mostrar(envio);
    this.error = '';
    this.mensaje = '';
  }

  private mostrar(envio: Envio): void {
    this.actual = envio;
    this.formulario = {
      operador: envio.operador,
      modalidad: envio.modalidad,
      numeroGuia: envio.numeroGuia || '',
      codigoRastreo: envio.codigoRastreo || '',
      observaciones: envio.observaciones || ''
    };
    this.estadoNuevo = this.transiciones[envio.estado][0] || envio.estado;
  }

  get editable(): boolean {
    return !this.actual || this.actual.estado === 'PENDIENTE' || this.actual.estado === 'PREPARANDO';
  }

  guardar(): void {
    if (!this.ventaId || this.guardando || !this.editable) return;
    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.api.guardar(this.ventaId, this.formulario).subscribe({
      next: envio => {
        this.mostrar(envio);
        this.mensaje = 'Datos del envio guardados. Ninguna guia fue emitida automaticamente.';
        this.guardando = false;
        this.refrescarEnvios();
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.error = this.mensajeError(e, 'No se pudo guardar el envio');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarEstado(): void {
    if (!this.ventaId || !this.actual || !this.transiciones[this.actual.estado].includes(this.estadoNuevo) || this.guardando) return;
    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.api.estado(this.ventaId, this.estadoNuevo).subscribe({
      next: envio => {
        this.mostrar(envio);
        this.mensaje = 'Estado logistico actualizado correctamente.';
        this.guardando = false;
        this.refrescarEnvios();
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.error = this.mensajeError(e, 'No se pudo cambiar el estado');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mensajeError(e: HttpErrorResponse, anterior: string): string {
    return typeof e.error?.message === 'string' && e.error.message.length < 250
      ? `${anterior}: ${e.error.message}` : `${anterior} (HTTP ${e.status})`;
  }
}
