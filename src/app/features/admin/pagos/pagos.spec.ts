import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PagosAdmin } from './pagos';
import { PagosService } from '../../../core/services/pagos.service';

describe('PagosAdmin errors', () => {
  for (const status of [0,401,403,404,500,502,503,504]) {
    it(`shows safe diagnostic for ${status}`, () => {
      TestBed.configureTestingModule({providers: [{provide:PagosService,useValue:{
        configuracion: () => throwError(() => new HttpErrorResponse({status,error:'sensitive-database-detail'})),
        listar: () => of([])
      }}]});
      const page=TestBed.runInInjectionContext(() => new PagosAdmin());
      page.cargar();
      expect(page.error()).toContain(status === 0 ? 'conectar' : `HTTP ${status}`);
      expect(page.error()).not.toContain('sensitive-database-detail');
      expect(page.cargando()).toBe(false); expect(page.configuracion()).toBeNull(); expect(page.pagos()).toEqual([]);
    });
  }
});
