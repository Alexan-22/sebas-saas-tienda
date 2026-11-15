import { CompraRequest } from '../../../../core/models/venta';
import { clavePrivada } from '../clave-privada';
const storageKey='sebas.transferencia.intento';
export function claveTransferencia(request:CompraRequest,storage:Storage=sessionStorage):Promise<string>{return clavePrivada(request,storageKey,storage);}
export function completarIntentoTransferencia(storage:Storage=sessionStorage):void{storage.removeItem(storageKey);}
