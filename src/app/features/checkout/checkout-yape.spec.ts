import { Checkout } from './checkout';
describe('Checkout Yape safety',()=>{
 it('blocks disabled Yape even if the buyer checked payment confirmation',()=>{
  const page=Object.create(Checkout.prototype) as Checkout;
  page.datos={metodoPago:'YAPE'} as Checkout['datos'];page.pagoYapeConfirmado=true;page.yapeDisponible=false;
  page.continuarPago();expect(page.error).toContain('No realices un depósito');
 });
});

describe('Yape checkout submission',()=>{
 it('lets the server handle reserved stock on retry and blocks double clicks',()=>{
  const page=Object.create(Checkout.prototype) as Checkout;
  page.datos={metodoPago:'YAPE',nombres:'Prueba',apellidos:'Local',telefono:'900000001',departamento:'Lima',provincia:'Lima',distrito:'Lima',direccion:'Fixture',referencia:''};
  page.yapeDisponible=true;page.aceptaTerminos=true;page.procesando=false;
  const submit=vi.fn(),preflight=vi.fn();
  Object.defineProperty(page,'items',{value:()=>[{}]});
  Object.defineProperty(page,'registrarCompra',{value:submit});
  Object.defineProperty(page,'validarStockAntesDeComprar',{value:preflight});
  page.continuarPago();page.continuarPago();
  expect(submit).toHaveBeenCalledTimes(1);expect(preflight).not.toHaveBeenCalled();expect(page.procesando).toBe(true);
 });
});
