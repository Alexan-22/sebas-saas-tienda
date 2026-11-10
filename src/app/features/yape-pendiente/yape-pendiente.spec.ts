import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { YapePendiente } from './yape-pendiente';
import { PagoYapeManual, YapePagosService } from '../../core/services/yape-pagos.service';
describe('Yape customer payment status', () => {
 let page:YapePendiente;
 let state:PagoYapeManual['estado'];
 const qr=vi.fn();
 beforeEach(()=>{
    TestBed.resetTestingModule();
  state='PENDIENTE';qr.mockReset().mockReturnValue(of(new Blob(['qr'],{type:'image/png'})));
  vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:isolated');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
  TestBed.configureTestingModule({providers:[{provide:ChangeDetectorRef,useValue:{markForCheck:()=>{}}},
   {provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({idVenta:'1'})}}},
   {provide:YapePagosService,useValue:{mio:()=>of({idVenta:1,estado:state}),qrMio:qr}}
  ]});
  page=TestBed.runInInjectionContext(()=>new YapePendiente());
 });
 afterEach(()=>{page?.ngOnDestroy();vi.restoreAllMocks();});
 it('loads the pending order QR again on reload',()=>{
  page.recargar();page.recargar();expect(qr).toHaveBeenCalledTimes(2);expect(page.qrObjectUrl).toBe('blob:isolated');
 });
 it('removes the QR when ADMIN approval is received without a false image error',()=>{
  page.recargar();state='APROBADO';page.recargar();expect(qr).toHaveBeenCalledTimes(1);expect(page.qrObjectUrl).toBeNull();expect(page.error).toBe('');expect(page.pago?.estado).toBe('APROBADO');
 });
 it('does not request a payment QR for rejected orders',()=>{
  state='RECHAZADO';page.recargar();expect(qr).not.toHaveBeenCalled();expect(page.error).toBe('');
 });
});
