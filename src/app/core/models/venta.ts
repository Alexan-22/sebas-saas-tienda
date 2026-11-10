// =========================================================
// COMPRA ONLINE
// =========================================================

export interface CompraItem {
  idProductoTalla: number;
  cantidad: number;
}

export interface DireccionEnvioRequest {
  departamento: string;
  provincia: string;
  distrito: string;
  direccionExacta: string;
  referencia: string;
}

export interface CompraRequest {
  claveIdempotencia?: string;
  cuentaBancariaId?: number;
  items: CompraItem[];
  medioPago: 'YAPE' | 'TRANSFERENCIA';
  direccionEnvio: DireccionEnvioRequest;
}

export interface CompraResponse {
  idVenta: number;
  subtotal: number;
  costoDelivery: number;
  total: number;
  estado: string;
  medioPago: string;
  mensaje: string;
}
