import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { YapeAdmin } from './yape';
import { YapeService } from '../../../core/services/yape.service';

describe('YapeAdmin', () => {
 let page:YapeAdmin;
 let saved=0;
 beforeEach(() => {
    TestBed.resetTestingModule();
  saved=0;
  TestBed.configureTestingModule({providers:[{provide:YapeService,useValue:{
   configuracionAdmin:()=>of({habilitado:false,numeroYape:'900000001',titularYape:'Prueba',qrUrl:'/api/yape/qr'}),
   obtenerQrAdmin:()=>of(new Blob(['fixture'],{type:'image/png'})),
   guardarConfiguracion:()=>{saved++;return of({habilitado:false,numeroYape:null,titularYape:null,qrUrl:null});}
  }}]});
  page=TestBed.runInInjectionContext(()=>new YapeAdmin());
  vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test');
  vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 });
 afterEach(()=>{page?.ngOnDestroy();vi.restoreAllMocks();});
 it('starts unconfigured',()=>expect(page.estadoTexto).toBe('Sin configurar'));
 it('reloads stored QR preview',()=>{page.cargar();expect(page.vistaPrevia()).toBe('blob:test');expect(page.qrGuardado()).toBe(true);expect(page.estadoTexto).toBe('Deshabilitado');});
 it('shows enabled only after loading enabled configuration',()=>{vi.spyOn(TestBed.inject(YapeService),'configuracionAdmin').mockReturnValue(of({habilitado:true,numeroYape:'900000001',titularYape:'Prueba',qrUrl:'/api/yape/qr'}));page.cargar();expect(page.estadoTexto).toBe('Habilitado');});
 it('rejects invalid Peruvian mobile before saving',()=>{page.form.numeroYape='800000001';page.guardar();expect(saved).toBe(0);expect(page.error()).toContain('9 dígitos');});
 it('rejects oversize upload',()=>{page.seleccionarArchivo({target:{files:[new File([new Uint8Array(2097153)],'qr.png',{type:'image/png'})],value:''}} as unknown as Event);expect(page.error()).toContain('2 MB');expect(page.vistaPrevia()).toBeNull();});
 it('previews selected PNG without claiming persistence',()=>{page.seleccionarArchivo({target:{files:[new File(['fixture'],'qr.png',{type:'image/png'})],value:''}} as unknown as Event);expect(page.vistaPrevia()).toBe('blob:test');expect(page.qrGuardado()).toBe(false);});
 it('rejects non image upload',()=>{page.seleccionarArchivo({target:{files:[new File(['fixture'],'qr.svg',{type:'image/svg+xml'})],value:''}} as unknown as Event);expect(page.error()).toContain('PNG o JPG');});
});

