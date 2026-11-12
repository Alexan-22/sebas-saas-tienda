import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BANCOS_PERU, BancoPeru, CuentaBancaria, TransferenciasService } from '../../../core/services/transferencias.service';

@Component({
  selector: 'app-cuentas-bancarias',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cuentas-bancarias.html',
  styleUrl: './cuentas-bancarias.css'
})
export class CuentasBancarias implements OnInit, OnDestroy {
  private readonly api = inject(TransferenciasService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subs = new Subscription();
  readonly bancos = BANCOS_PERU;
  cuentas: Record<BancoPeru, CuentaBancaria> = {
    BCP: { moneda: 'PEN', banco: 'BCP', titular: '', numeroCuenta: '', cci: null, habilitado: false },
    BBVA: { moneda: 'PEN', banco: 'BBVA', titular: '', numeroCuenta: '', cci: null, habilitado: false },
    INTERBANK: { moneda: 'PEN', banco: 'INTERBANK', titular: '', numeroCuenta: '', cci: null, habilitado: false },
    SCOTIABANK: { moneda: 'PEN', banco: 'SCOTIABANK', titular: '', numeroCuenta: '', cci: null, habilitado: false }
  };
  cargando = true;
  guardando: BancoPeru | null = null;
  mensaje = '';
  error = '';

  ngOnInit(): void { this.cargar(); }
  cargar(): void {
    this.cargando = true; this.error = '';
    this.subs.add(this.api.cuentasAdmin().subscribe({
      next: lista => {
        for (const cuenta of lista) {
          if (Object.prototype.hasOwnProperty.call(this.cuentas, cuenta.banco)) {
            this.cuentas[cuenta.banco] = { ...cuenta };
          }
        }
        this.cargando = false; this.cdr.markForCheck();
      },
      error: e => { this.error = `No se pudieron consultar los bancos (HTTP ${e.status}).`; this.cargando = false; this.cdr.markForCheck(); }
    }));
  }
  guardar(banco: BancoPeru): void {
    if (this.guardando || this.cargando) return;
    const c = this.cuentas[banco];
    const titular = c.titular.trim();
    const numeroCuenta = c.numeroCuenta.trim();
    const cci = (c.cci || '').trim();
    if (!titular || titular.length > 140 || !/^[0-9]{7,30}$/.test(numeroCuenta) || (cci !== '' && !/^[0-9]{20}$/.test(cci))) {
      this.error = 'Revisa titular, número de cuenta (7–30 dígitos) y CCI (20 dígitos si corresponde).';
      return;
    }
    this.guardando = banco; this.error = ''; this.mensaje = '';
    const payload: CuentaBancaria = { ...c, titular, numeroCuenta, cci: cci || null };
    this.subs.add(this.api.guardarCuenta(banco, payload).subscribe({
      next: guardada => { this.cuentas[banco] = { ...guardada }; this.guardando = null; this.mensaje = `Cuenta ${banco} guardada correctamente.`; this.cdr.markForCheck(); },
      error: e => { this.guardando = null; this.error = `No se pudo guardar ${banco} (HTTP ${e.status}).`; this.cdr.markForCheck(); }
    }));
  }
  ngOnDestroy(): void { this.subs.unsubscribe(); }
}