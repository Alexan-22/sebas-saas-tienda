import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, timeout } from 'rxjs';
import { EventoTransferencia, PagoTransferencia, TransferenciasService } from '../../../core/services/transferencias.service';

@Component({
  selector: 'app-transferencias-pagos',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './transferencias-pagos.html',
  styleUrl: './transferencias-pagos.css'
})
export class TransferenciasPagos implements OnInit, OnDestroy {
  private readonly api = inject(TransferenciasService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subs = new Subscription();
  private cargaActual: Subscription | null = null;
  private versionCarga = 0;
  pagos: PagoTransferencia[] = [];
  imagenes: Record<number, string> = {};
  eventos: EventoTransferencia[] = [];
  auditoriaId: number | null = null;
  cargando = false;
  operando: number | null = null;
  error = '';
  mensaje = '';
  filtro: 'TODOS' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' = 'PENDIENTE';

  get filtrados(): PagoTransferencia[] { return this.filtro === 'TODOS' ? this.pagos : this.pagos.filter(p => p.estado === this.filtro); }
  get pendientes(): number { return this.pagos.filter(p => p.estado === 'PENDIENTE').length; }
  get aprobados(): number { return this.pagos.filter(p => p.estado === 'APROBADO').length; }
  ngOnInit(): void { this.cargarPagos(); }
  cambiarFiltro(f: 'TODOS' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'): void { this.filtro = f; }
  cargarPagos(): void {
    const version = ++this.versionCarga;

    // Cancelar la consulta anterior del listado.
    this.cargaActual?.unsubscribe();

    this.cargando = true;
    this.error = '';
    this.cdr.detectChanges();

    const consulta = this.api.pagosAdmin()
      .pipe(timeout(30000))
      .subscribe({
        next: lista => {
          if (version !== this.versionCarga) return;

          this.pagos = Array.isArray(lista) ? lista : [];
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: e => {
          if (version !== this.versionCarga) return;

          this.cargando = false;
          this.error = e.name === 'TimeoutError'
            ? 'La consulta de transferencias superó los 30 segundos.'
            : `No se pudieron cargar transferencias (HTTP ${e.status ?? '?'}).`;

          this.cdr.detectChanges();
        }
      });

    this.cargaActual = consulta;
    this.subs.add(consulta);
  }
  verComprobante(id: number): void {
    if (this.imagenes[id]) { URL.revokeObjectURL(this.imagenes[id]); delete this.imagenes[id]; this.cdr.markForCheck(); return; }
    this.subs.add(this.api.imagenAdmin(id).subscribe({
      next: blob => { if (!blob.type.startsWith('image/')) { this.error = 'El comprobante no es una imagen válida.'; this.cdr.markForCheck(); return; } this.imagenes[id] = URL.createObjectURL(blob); this.cdr.markForCheck(); },
      error: e => { this.error = e.status === 404 ? 'El cliente todavía no envió comprobante.' : `Error de comprobante (HTTP ${e.status}).`; this.cdr.markForCheck(); }
    }));
  }
  verAuditoria(id: number): void {
    if (this.auditoriaId === id) { this.auditoriaId = null; this.eventos = []; return; }
    this.auditoriaId = id; this.eventos = [];
    this.subs.add(this.api.auditoria(id).subscribe({
      next: eventos => { if (this.auditoriaId === id) this.eventos = eventos; this.cdr.markForCheck(); },
      error: e => { this.error = `No se pudo consultar auditoría (HTTP ${e.status}).`; this.cdr.markForCheck(); }
    }));
  }
  aprobar(p: PagoTransferencia): void {
    if (this.operando !== null || p.estado !== 'PENDIENTE') return;
    if (!window.confirm(`Pedido #${p.idVenta}. ¿Comprobaste en tu banco el ingreso real de S/ ${Number(p.importe).toFixed(2)}?`)) return;
    this.operando = p.idVenta; this.error = ''; this.mensaje = '';
    this.subs.add(this.api.aprobar(p.idVenta).subscribe({
      next: () => { this.operando = null; this.mensaje = 'Transferencia aprobada y auditada.'; this.cargarPagos(); this.cdr.markForCheck(); },
      error: e => { this.operando = null; this.error = `Error al aprobar (HTTP ${e.status}).`; this.cdr.markForCheck(); }
    }));
  }
  rechazar(p: PagoTransferencia): void {
    if (this.operando !== null || p.estado !== 'PENDIENTE') return;
    const motivo = window.prompt(`Motivo de rechazo del pedido #${p.idVenta}`)?.trim();
    if (!motivo) return;
    if (motivo.length > 250) { this.error = 'El motivo no puede superar los 250 caracteres.'; return; }
    this.operando = p.idVenta; this.error = ''; this.mensaje = '';
    this.subs.add(this.api.rechazar(p.idVenta, motivo).subscribe({
      next: () => { this.operando = null; this.mensaje = 'Transferencia rechazada y auditada. Revisa la reposición de stock.'; this.cargarPagos(); this.cdr.markForCheck(); },
      error: e => { this.operando = null; this.error = `Error al rechazar (HTTP ${e.status}).`; this.cdr.markForCheck(); }
    }));
  }
  ngOnDestroy(): void { this.subs.unsubscribe(); Object.values(this.imagenes).forEach(url => URL.revokeObjectURL(url)); }
}