import { Component, ChangeDetectorRef, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PagoTransferencia, TransferenciasService } from '../../core/services/transferencias.service';

@Component({
  selector:'app-transferencia-pendiente', standalone:true,
  imports:[CommonModule,RouterLink],
  template:`
    <main class="min-h-screen bg-slate-50 px-5 py-12">
      <section class="mx-auto max-w-2xl rounded-2xl border bg-white p-6 shadow-sm sm:p-10">
        <h1 class="text-2xl font-bold">Transferencia bancaria</h1>
        <p class="mt-2 text-slate-600">El pago se confirma únicamente cuando la tienda verifica el abono.</p>
        @if (cargando) {<p class="mt-5">Consultando el pedido...</p>}
        @if (error) {<p role="alert" class="mt-4 rounded bg-red-50 p-3 text-red-700">{{error}}</p>}
        @if (pago; as p) {
          <div class="mt-5 space-y-3 text-sm">
            <div class="flex justify-between"><strong>Pedido</strong><span>#{{p.idVenta}}</span></div>
            <div class="flex justify-between"><strong>Importe exacto</strong><span>S/ {{p.importe | number:'1.2-2'}}</span></div>
            <div class="flex justify-between"><strong>Moneda {{p.moneda}} · Estado</strong><strong>{{p.estado}}</strong></div>
            <div class="flex justify-between"><strong>Banco</strong><span>{{p.banco}}</span></div>
            <div class="flex justify-between"><strong>Titular</strong><span>{{p.titular}}</span></div>
            <div class="flex justify-between"><strong>Número de cuenta</strong><button class="underline" (click)="copiar(p.numeroCuenta)">Copiar cuenta</button><span class="select-all">{{p.numeroCuenta}}</span></div>
            @if (p.cci) {
              <div class="flex justify-between"><strong>CCI</strong><button class="underline" (click)="copiar(p.cci!)">Copiar CCI</button><span class="select-all">{{p.cci}}</span></div>
            }
          </div>
          @if(infoEnviada){<button class="mt-4 rounded border p-3" (click)="verImagen()">Ver mi comprobante guardado</button>}
          @if(imagenGuardada){<img [src]="imagenGuardada" alt="Comprobante privado guardado" class="mt-3 max-h-72 max-w-full"/>}
          @if(mensaje){<p role="status">{{mensaje}}</p>}
          @if (p.estado === 'PENDIENTE') {
            <p class="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
              Verifica los datos del destinatario antes de transferir. Esta pantalla no realiza ninguna transferencia.
              No pagues dos veces ni compartas códigos de seguridad.
            </p>
            <section class="mt-5 rounded-xl border p-4">
              <h2 class="font-bold">Enviar captura de la transferencia</h2>
              @if (infoEnviada && !reemplazando) {
                <p class="mt-2 text-green-700">Comprobante recibido por la tienda; pago pendiente de verificación.</p><button type="button" class="mt-2 underline" (click)="pedirReemplazo()">Reemplazar evidencia con motivo</button><p class="text-xs">Solo mientras está pendiente. La evidencia anterior se conserva y el cambio queda auditado.</p>
              } @else {
                <label for="capture-bank" class="mt-3 block text-sm">Selecciona PNG o JPG (máximo 5 MB)</label>
                <input id="capture-bank" type="file" accept="image/png,image/jpeg" (change)="seleccionar($event)"
                       class="mt-2 block w-full text-sm" />
                @if (preview) {<img [src]="preview" alt="Vista previa local del comprobante" class="mt-3 max-h-72 rounded border"/>}
                <button type="button" (click)="subir()" [disabled]="!archivo || subiendo"
                  class="mt-3 rounded-lg bg-indigo-600 px-4 py-3 text-white disabled:opacity-40">
                  {{subiendo?'Enviando...':'Enviar comprobante'}}
                </button>
              }
            </section>
            @if (whatsappUrl) {
              <a class="mt-4 inline-block rounded-lg border border-green-700 px-4 py-3 text-green-700"
                 [href]="whatsappUrl" target="_blank" rel="noopener noreferrer">Avisar por WhatsApp</a>
              <p class="mt-1 text-xs text-slate-500">En WhatsApp debes adjuntar manualmente la imagen.</p>
            }
          } @else if (p.estado === 'APROBADO') {
            <p class="mt-4 rounded-lg bg-green-50 p-4 text-green-800">Transferencia verificada por la tienda.</p>
          } @else {
            <p class="mt-4 rounded-lg bg-red-50 p-4 text-red-800">Pago rechazado: {{p.motivoRechazo}}</p>
          }
        }
        <div class="mt-6 flex gap-3">
          <button type="button" (click)="recargar()" class="rounded bg-slate-900 px-4 py-3 text-white">Actualizar estado</button>
          <a routerLink="/" class="rounded border px-4 py-3">Volver a la tienda</a>
        </div>
      </section>
    </main>
  `
})
export class TransferenciaPendiente implements OnInit,OnDestroy {
  private readonly ruta=inject(ActivatedRoute);
  private readonly api=inject(TransferenciasService);
  private readonly cdr=inject(ChangeDetectorRef);
  private subs=new Subscription();
  pago:PagoTransferencia|null=null;
  cargando=true;
  error='';
  mensaje='';imagenGuardada:string|null=null;reemplazando=false;motivoReemplazo='';
  archivo:File|null=null;
  preview:string|null=null;
  infoEnviada=false;
  subiendo=false;
  whatsappUrl:string|null=null;
  ngOnInit():void{this.recargar();}
  recargar():void{
    this.subs.unsubscribe();this.subs=new Subscription();this.liberarGuardada();this.reemplazando=false;this.liberarPreview();this.archivo=null;
    const id=Number(this.ruta.snapshot.paramMap.get('idVenta'));
    if(!Number.isInteger(id)||id<=0){this.cargando=false;this.error='Pedido inválido';this.cdr.markForCheck();return;}
    this.pago=null;this.cargando=true;this.error='';this.infoEnviada=false;this.whatsappUrl=null;
    this.cdr.markForCheck();
    this.subs.add(this.api.miPago(id).subscribe({
      next:p=>{this.pago=p;this.cargando=false;this.cdr.markForCheck();
        this.consultarComprobante(id);
      },
      error:e=>{this.cargando=false;this.error=`No se pudo consultar el pedido (HTTP ${e.status}).`;this.cdr.markForCheck();}
    }));
  }
  private consultarComprobante(id:number):void{
    this.subs.add(this.api.misDatosComprobante(id).subscribe({
      next:()=>{this.infoEnviada=true;this.cdr.markForCheck();},
      error:e=>{if(e.status!==404)this.error=`No se pudo consultar el comprobante (HTTP ${e.status}).`;this.cdr.markForCheck();}
    }));
    this.subs.add(this.api.contacto(id).subscribe({
      next:c=>{this.whatsappUrl=c.url?.startsWith('https://wa.me/')?c.url:null;this.cdr.markForCheck();},
      error:()=>{this.whatsappUrl=null;this.cdr.markForCheck();}
    }));
  }
  seleccionar(event:Event):void{
    this.liberarPreview();this.archivo=null;this.error='';
    const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;
    if(file.size<=0||file.size>5*1024*1024||!['image/png','image/jpeg'].includes(file.type)){
      this.error='Selecciona una imagen PNG o JPG de hasta 5 MB.';input.value='';return;
    }
    this.archivo=file;this.preview=URL.createObjectURL(file);this.cdr.markForCheck();
  }
  subir():void{
    if(!this.pago||this.pago.estado!=='PENDIENTE'||!this.archivo||this.subiendo||(this.infoEnviada&&!this.reemplazando))return;
    this.subiendo=true;this.error='';this.cdr.markForCheck();
    const envio=this.reemplazando?this.api.reemplazarComprobante(this.pago.idVenta,this.archivo,this.motivoReemplazo):this.api.enviarComprobante(this.pago.idVenta,this.archivo);
    this.subs.add(envio.subscribe({
      next:()=>{this.reemplazando=false;this.liberarGuardada();this.infoEnviada=true;this.subiendo=false;this.archivo=null;this.liberarPreview();this.cdr.markForCheck();},
      error:e=>{this.subiendo=false;this.error=`No se pudo enviar el comprobante (HTTP ${e.status}).`;this.cdr.markForCheck();}
    }));
  }
  pedirReemplazo():void{const motivo=window.prompt('Motivo del reemplazo (máximo 100 caracteres). La imagen anterior se conservará.')?.trim();if(!motivo||motivo.length>100)return;this.motivoReemplazo=motivo;this.reemplazando=true;this.cdr.markForCheck();}
  verImagen():void{if(!this.pago)return;this.subs.add(this.api.imagenMia(this.pago.idVenta).subscribe({next:b=>{this.liberarGuardada();this.imagenGuardada=URL.createObjectURL(b);this.cdr.markForCheck();},error:e=>{this.error=`No se pudo cargar la imagen privada (HTTP ${e.status}).`;this.cdr.markForCheck();}}));}
  async copiar(texto:string):Promise<void>{try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(texto);}else{const input=document.createElement('textarea');input.value=texto;document.body.appendChild(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok)throw new Error();}this.mensaje='Copiado';}catch{this.mensaje='No se pudo copiar automáticamente. Selecciona y copia el número visible.';}this.cdr.markForCheck();}
  private liberarGuardada():void{if(this.imagenGuardada)URL.revokeObjectURL(this.imagenGuardada);this.imagenGuardada=null;}
  private liberarPreview():void{if(this.preview)URL.revokeObjectURL(this.preview);this.preview=null;}
  ngOnDestroy():void{this.liberarGuardada();this.subs.unsubscribe();this.liberarPreview();}
}
