
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  BANCOS_PERU,
  BancoPeru,
  CuentaBancaria,
  PagoTransferencia,
  TransferenciasService,
  EventoTransferencia
} from '../../core/services/transferencias.service';

@Component({
  selector: 'app-transferencias-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transferencias-admin.html',
  styleUrl: './transferencias-admin.css'
})
export class TransferenciasAdmin implements OnInit, OnDestroy {

  private readonly api = inject(TransferenciasService);
  private readonly cdr = inject(ChangeDetectorRef);

  private subs = new Subscription();

  readonly bancos = BANCOS_PERU;

  cuentas: Record<BancoPeru, CuentaBancaria> = {
    BCP: {
      moneda: 'PEN',
      banco: 'BCP',
      titular: '',
      numeroCuenta: '',
      cci: null,
      habilitado: false
    },
    BBVA: {
      moneda: 'PEN',
      banco: 'BBVA',
      titular: '',
      numeroCuenta: '',
      cci: null,
      habilitado: false
    },
    INTERBANK: {
      moneda: 'PEN',
      banco: 'INTERBANK',
      titular: '',
      numeroCuenta: '',
      cci: null,
      habilitado: false
    },
    SCOTIABANK: {
      moneda: 'PEN',
      banco: 'SCOTIABANK',
      titular: '',
      numeroCuenta: '',
      cci: null,
      habilitado: false
    }
  };

  eventos: EventoTransferencia[] = [];
  auditoriaId: number | null = null;

  pagos: PagoTransferencia[] = [];

  imagenes: Record<number, string> = {};

  cargando = false;
  guardando: BancoPeru | null = null;
  operando: number | null = null;

  error = '';
  mensaje = '';

  ngOnInit(): void {
    this.cargarCuentas();
    this.cargarPagos();
  }

  // ==========================================
  // CUENTAS BANCARIAS
  // ==========================================

  cargarCuentas(): void {
    this.subs.add(
      this.api.cuentasAdmin().subscribe({
        next: (lista) => {
          for (const c of lista) {
            this.cuentas[c.banco] = { ...c };
          }

          this.cdr.markForCheck();
        },
        error: (e) => {
          this.error =
            `No se pudieron consultar las cuentas (HTTP ${e.status}).`;

          this.cdr.markForCheck();
        }
      })
    );
  }

  guardar(banco: BancoPeru): void {
    const c = this.cuentas[banco];

    if (
      !c.titular.trim() ||
      !/^[0-9]{7,30}$/.test(c.numeroCuenta) ||
      (c.cci && !/^[0-9]{20}$/.test(c.cci))
    ) {
      this.error =
        'Completa titular, número de cuenta válido y CCI de 20 dígitos si corresponde.';

      this.cdr.markForCheck();
      return;
    }

    this.guardando = banco;
    this.error = '';
    this.mensaje = '';

    this.cdr.markForCheck();

    this.subs.add(
      this.api.guardarCuenta(banco, c).subscribe({
        next: (respuesta) => {
          this.cuentas[banco] = { ...respuesta };
          this.guardando = null;
          this.mensaje = `Cuenta ${banco} guardada.`;

          this.cdr.markForCheck();
        },
        error: (e) => {
          this.guardando = null;
          this.error =
            `No se guardó ${banco} (HTTP ${e.status}).`;

          this.cdr.markForCheck();
        }
      })
    );
  }

  // ==========================================
  // TRANSFERENCIAS
  // ==========================================

  cargarPagos(): void {
    this.cargando = true;
    this.cdr.markForCheck();

    this.subs.add(
      this.api.pagosAdmin().subscribe({
        next: (lista) => {
          this.pagos = Array.isArray(lista) ? lista : [];
          this.cargando = false;

          this.cdr.markForCheck();
        },
        error: (e) => {
          this.error =
            `Error consultando transferencias (HTTP ${e.status}).`;

          this.cargando = false;
          this.cdr.markForCheck();
        }
      })
    );
  }

  // ==========================================
  // COMPROBANTES
  // ==========================================

  verComprobante(id: number): void {
    if (this.imagenes[id]) {
      URL.revokeObjectURL(this.imagenes[id]);
      delete this.imagenes[id];

      this.cdr.markForCheck();
      return;
    }

    this.subs.add(
      this.api.imagenAdmin(id).subscribe({
        next: (blob) => {
          if (!blob.type.startsWith('image/')) {
            this.error =
              'El comprobante no es una imagen válida.';

            this.cdr.markForCheck();
            return;
          }

          this.imagenes[id] = URL.createObjectURL(blob);

          this.cdr.markForCheck();
        },
        error: (e) => {
          this.error = e.status === 404
            ? 'El cliente todavía no envió comprobante.'
            : `No se pudo recuperar comprobante (HTTP ${e.status}).`;

          this.cdr.markForCheck();
        }
      })
    );
  }

  // ==========================================
  // APROBAR TRANSFERENCIA
  // ==========================================

  aprobar(p: PagoTransferencia): void {
    if (
      this.operando !== null ||
      p.estado !== 'PENDIENTE'
    ) {
      return;
    }

    const confirmado = window.confirm(
      `Pedido #${p.idVenta}. ¿Comprobaste en la cuenta bancaria que recibiste exactamente S/ ${Number(p.importe).toFixed(2)}?`
    );

    if (!confirmado) {
      return;
    }

    this.operando = p.idVenta;
    this.error = '';

    this.cdr.markForCheck();

    this.subs.add(
      this.api.aprobar(p.idVenta).subscribe({
        next: () => {
          this.operando = null;
          this.mensaje =
            'Transferencia aprobada y auditada.';

          this.cargarPagos();
        },
        error: (e) => {
          this.operando = null;
          this.error =
            `Error al aprobar (HTTP ${e.status}).`;

          this.cdr.markForCheck();
        }
      })
    );
  }

  // ==========================================
  // RECHAZAR TRANSFERENCIA
  // ==========================================

  rechazar(p: PagoTransferencia): void {
    if (
      this.operando !== null ||
      p.estado !== 'PENDIENTE'
    ) {
      return;
    }

    const motivo = window.prompt(
      `Motivo de rechazo para pedido #${p.idVenta}`
    )?.trim();

    if (!motivo) {
      return;
    }

    if (motivo.length > 250) {
      this.error = 'Máximo 250 caracteres.';
      this.cdr.markForCheck();
      return;
    }

    this.operando = p.idVenta;
    this.error = '';

    this.cdr.markForCheck();

    this.subs.add(
      this.api.rechazar(p.idVenta, motivo).subscribe({
        next: () => {
          this.operando = null;

          this.mensaje =
            'Transferencia rechazada y auditada; revisa reposición de stock.';

          this.cargarPagos();
        },
        error: (e) => {
          this.operando = null;
          this.error =
            `Error al rechazar (HTTP ${e.status}).`;

          this.cdr.markForCheck();
        }
      })
    );
  }

  // ==========================================
  // AUDITORÍA
  // ==========================================

  verAuditoria(id: number): void {
    this.auditoriaId = id;

    this.subs.add(
      this.api.auditoria(id).subscribe({
        next: (eventos) => {
          this.eventos = eventos;
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.error =
            `No se pudo consultar auditoría (HTTP ${e.status})`;

          this.cdr.markForCheck();
        }
      })
    );
  }

  // ==========================================
  // LIBERAR RECURSOS
  // ==========================================

  ngOnDestroy(): void {
    this.subs.unsubscribe();

    Object.values(this.imagenes).forEach((url) => {
      URL.revokeObjectURL(url);
    });
  }
}
