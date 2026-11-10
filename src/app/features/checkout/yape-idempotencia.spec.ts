import { claveYape, completarIntentoYape } from './yape-idempotencia';
import { CompraRequest } from '../../core/models/venta';
describe('Yape checkout retries', () => {
 const request: CompraRequest = { medioPago:'YAPE', items:[{idProductoTalla:1,cantidad:1}], direccionEnvio:{departamento:'Lima',provincia:'Lima',distrito:'Lima',direccionExacta:'Fixture',referencia:''} };
 beforeEach(() => sessionStorage.clear());
 it('reuses the key after retry or component recreation', () => {
  const key = claveYape(request); expect(claveYape(structuredClone(request))).toBe(key);
  expect(key).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 });
 it('uses a different key when the order changes', () => {
  const key=claveYape(request);expect(claveYape({...request,items:[{idProductoTalla:1,cantidad:2}]})).not.toBe(key);
 });
 it('starts a new attempt only after a successful order', () => {
  const key=claveYape(request);completarIntentoYape();expect(claveYape(request)).not.toBe(key);
 });
});
