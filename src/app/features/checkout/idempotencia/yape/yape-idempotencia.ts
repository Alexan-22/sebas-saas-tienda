import { CompraRequest } from '../../../../core/models/venta';
import { clavePrivada } from '../clave-privada';
const storageKey='sebas.yape.intento';
export function claveYape(request:CompraRequest,storage:Storage=sessionStorage):Promise<string>{return clavePrivada(request,storageKey,storage);}
export function completarIntentoYape(storage:Storage=sessionStorage):void{storage.removeItem(storageKey);}
