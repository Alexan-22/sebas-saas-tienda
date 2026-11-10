import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  BANCOS_PERU, BancoPeru, CuentaBancaria, PagoTransferencia,
  TransferenciasService, EventoTransferencia
} from '../../core/services/transferencias.service';

@Component({
  selector:'app-transferencias-admin',standalone:true,
  imports:[CommonModule,FormsModule],
  template:`
    <section class="p-6 lg:p-10">
      <h1 class="text-2xl font-bold">Transferencias bancarias de mi tienda</h1>
      <p class="mt-2 text-sm text-slate-600">Configura cuentas de tu negocio. El dinero llega directo a tu banco y el pago se valida manualmente.</p>
      @if (error) {<p class="mt-4 rounded bg-red-50 p-3 text-red-700" role="alert">{{error}}</p>}
      @if (mensaje) {<p class="mt-4 rounded bg-green-50 p-3 text-green-700">{{mensaje}}</p>}
      <h2 class="mt-8 text-lg font-bold" id="cuentas">Mis cuentas bancarias</h2>
      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        @for (b of bancos; track b.codigo) {
          <article class="rounded-xl border bg-white p-5">
            <h3 class="font-bold">{{b.nombre}}</h3>
            <label class="mt-3 block text-xs font-semibold">Titular de la cuenta</label>
            <input class="mt-1 w-full rounded border p-2" [(ngModel)]="cuentas[b.codigo].titular"
                   maxlength="140" autocomplete="off" />
            <label class="mt-3 block text-xs font-semibold">Número de cuenta</label>
            <input class="mt-1 w-full rounded border p-2" [(ngModel)]="cuentas[b.codigo].numeroCuenta"
                   maxlength="30" inputmode="numeric" autocomplete="off" />
            <label class="mt-3 block text-xs font-semibold">CCI (opcional, 20 dígitos)</label>
            <input class="mt-1 w-full rounded border p-2" [(ngModel)]="cuentas[b.codigo].cci"
                   maxlength="20" inputmode="numeric" autocomplete="off" />
            <label class="mt-3 flex gap-2 text-sm">
              <input type="checkbox" [(ngModel)]="cuentas[b.codigo].habilitado" />
              Habilitar este banco para mi tienda
            </label>
            <button type="button" class="mt-4 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              [disabled]="guardando !== null" (click)="guardar(b.codigo)">
              {{guardando===b.codigo?'Guardando...':'Guardar cuenta bancaria'}}
            </button>
          </article>
        }
      </div>
      <div class="mt-9 flex items-center justify-between gap-4">
        <h2 class="text-xl font-bold" id="pendientes">Transferencias pendientes</h2>
        <button type="button" (click)="cargarPagos()" [disabled]="cargando"
          class="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">Actualizar</button>
      </div>
      @if (cargando) {<p class="mt-4">Cargando transferencias...</p>}
      @if (!cargando && pagos.length === 0) {<p class="mt-4">No hay transferencias registradas.</p>}
      <div class="mt-4 grid gap-4">
        @for (p of pagos; track p.idVenta) {
          <article class="rounded-xl border bg-white p-5">
            <div class="flex flex-wrap justify-between gap-3">
              <div>
                <h3 class="font-bold">Pedido #{{p.idVenta}}</h3>
                <p class="text-sm">{{p.correoCliente}}</p>
                <p class="text-sm">{{p.banco}} · {{p.titular}}</p><p class="text-sm">Cuenta: {{p.numeroCuenta}} · {{p.moneda}}</p>
                <p class="text-xs text-slate-500">{{p.creadoEn | date:'medium'}}</p>
              </div>
              <div class="text-right"><strong>S/ {{p.importe | number:'1.2-2'}}</strong><p>{{p.estado}}</p></div>
            </div>
            <button type="button" class="mt-3 rounded border px-4 py-2" (click)="verComprobante(p.idVenta)">
              {{imagenes[p.idVenta]?'Ocultar comprobante':'Ver comprobante enviado'}}
            </button>
            @if (imagenes[p.idVenta]) {
              <div class="mt-3 rounded bg-slate-50 p-4">
                <img [src]="imagenes[p.idVenta]" alt="Captura enviada por cliente" class="max-h-96 max-w-full object-contain" />
                <p class="mt-2 text-xs text-amber-800">Esta imagen no prueba que el dinero haya ingresado. Comprueba el abono en tu cuenta bancaria.</p>
              </div>
            }
            <button class="mt-3 rounded border px-4 py-2" (click)="verAuditoria(p.idVenta)">Consultar auditoría</button>
            @if(auditoriaId===p.idVenta){ @for(e of eventos;track $index){<p class="text-sm">{{e.ocurridoEn | date:'short'}} · {{e.actorCorreo}} · {{e.estadoAnterior}} → {{e.estadoNuevo}} · {{e.evento}} · {{e.observacion}}</p>} }
            @if (p.estado === 'PENDIENTE') {
              <div class="mt-4 flex flex-wrap gap-3">
                <button type="button" class="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                        (click)="aprobar(p)" [disabled]="operando !== null">Aprobar pago verificado</button>
                <button type="button" class="rounded border border-red-600 px-4 py-2 text-red-700 disabled:opacity-50"
                        (click)="rechazar(p)" [disabled]="operando !== null">Rechazar</button>
              </div>
            } @else {
              <p class="mt-3 text-xs text-slate-600">Verificado por {{p.verificadoPor}} · {{p.verificadoEn | date:'medium'}}</p>
              @if (p.motivoRechazo) {<p class="text-sm text-red-700">{{p.motivoRechazo}}</p>}
            }
          </article>
        }
      </div>
    </section>
  `
})
export class TransferenciasAdmin implements OnInit, OnDestroy {
  private readonly api=inject(TransferenciasService);
  private readonly cdr=inject(ChangeDetectorRef);
  private subs=new Subscription();
  readonly bancos=BANCOS_PERU;
  cuentas:Record<BancoPeru,CuentaBancaria>={
    BCP:{moneda:'PEN',banco:'BCP',titular:'',numeroCuenta:'',cci:null,habilitado:false},
    BBVA:{moneda:'PEN',banco:'BBVA',titular:'',numeroCuenta:'',cci:null,habilitado:false},
    INTERBANK:{moneda:'PEN',banco:'INTERBANK',titular:'',numeroCuenta:'',cci:null,habilitado:false},
    SCOTIABANK:{moneda:'PEN',banco:'SCOTIABANK',titular:'',numeroCuenta:'',cci:null,habilitado:false}
  };
  eventos:EventoTransferencia[]=[];
  auditoriaId:number|null=null;
  pagos:PagoTransferencia[]=[];
  imagenes:Record<number,string>={};
  cargando=false;guardando:BancoPeru|null=null;operando:number|null=null;error='';mensaje='';
  ngOnInit():void{this.cargarCuentas();this.cargarPagos();}
  cargarCuentas():void{
    this.subs.add(this.api.cuentasAdmin().subscribe({
      next:lista=>{for(const c of lista)this.cuentas[c.banco]={...c};this.cdr.markForCheck();},
      error:e=>{this.error=`No se pudieron consultar las cuentas (HTTP ${e.status}).`;this.cdr.markForCheck();}
    }));
  }
  guardar(banco:BancoPeru):void{
    const c=this.cuentas[banco];
    if(!c.titular.trim()||!/^[0-9]{7,30}$/.test(c.numeroCuenta)
      ||(c.cci && !/^[0-9]{20}$/.test(c.cci))){
      this.error='Completa titular, número de cuenta válido y CCI de 20 dígitos si corresponde.';return;
    }
    this.guardando=banco;this.error='';this.mensaje='';this.cdr.markForCheck();
    this.subs.add(this.api.guardarCuenta(banco,c).subscribe({
      next:r=>{this.cuentas[banco]={...r};this.guardando=null;this.mensaje=`Cuenta ${banco} guardada.`;this.cdr.markForCheck();},
      error:e=>{this.guardando=null;this.error=`No se guardó ${banco} (HTTP ${e.status}).`;this.cdr.markForCheck();}
    }));
  }
  cargarPagos():void{
    this.cargando=true;this.cdr.markForCheck();
    this.subs.add(this.api.pagosAdmin().subscribe({
      next:lista=>{this.pagos=Array.isArray(lista)?lista:[];this.cargando=false;this.cdr.markForCheck();},
      error:e=>{this.error=`Error consultando transferencias (HTTP ${e.status}).`;this.cargando=false;this.cdr.markForCheck();}
    }));
  }
  verComprobante(id:number):void{
    if(this.imagenes[id]){URL.revokeObjectURL(this.imagenes[id]);delete this.imagenes[id];this.cdr.markForCheck();return;}
    this.subs.add(this.api.imagenAdmin(id).subscribe({
      next:b=>{if(!b.type.startsWith('image/')){this.error='El comprobante no es una imagen válida.';return;}
        this.imagenes[id]=URL.createObjectURL(b);this.cdr.markForCheck();},
      error:e=>{this.error=e.status===404?'El cliente todavía no envió comprobante.':`No se pudo recuperar comprobante (HTTP ${e.status}).`;this.cdr.markForCheck();}
    }));
  }
  aprobar(p:PagoTransferencia):void{
    if(this.operando!==null||p.estado!=='PENDIENTE')return;
    if(!window.confirm(`Pedido #${p.idVenta}. ¿Comprobaste en la cuenta bancaria que recibiste exactamente S/ ${Number(p.importe).toFixed(2)}?`))return;
    this.operando=p.idVenta;this.error='';this.cdr.markForCheck();
    this.subs.add(this.api.aprobar(p.idVenta).subscribe({
      next:()=>{this.operando=null;this.mensaje='Transferencia aprobada y auditada.';this.cargarPagos();},
      error:e=>{this.operando=null;this.error=`Error al aprobar (HTTP ${e.status}).`;this.cdr.markForCheck();}
    }));
  }
  rechazar(p:PagoTransferencia):void{
    if(this.operando!==null||p.estado!=='PENDIENTE')return;
    const motivo=window.prompt(`Motivo de rechazo para pedido #${p.idVenta}`)?.trim();
    if(!motivo)return;
    if(motivo.length>250){this.error='Máximo 250 caracteres.';return;}
    this.operando=p.idVenta;this.error='';this.cdr.markForCheck();
    this.subs.add(this.api.rechazar(p.idVenta,motivo).subscribe({
      next:()=>{this.operando=null;this.mensaje='Transferencia rechazada y auditada; revisa reposición de stock.';this.cargarPagos();},
      error:e=>{this.operando=null;this.error=`Error al rechazar (HTTP ${e.status}).`;this.cdr.markForCheck();}
    }));
  }
  verAuditoria(id:number):void{this.auditoriaId=id;this.subs.add(this.api.auditoria(id).subscribe({next:e=>{this.eventos=e;this.cdr.markForCheck();},error:e=>{this.error=`No se pudo consultar auditoría (HTTP ${e.status})`;this.cdr.markForCheck();}}));}
  ngOnDestroy():void{this.subs.unsubscribe();Object.values(this.imagenes).forEach(u=>URL.revokeObjectURL(u));}
}
