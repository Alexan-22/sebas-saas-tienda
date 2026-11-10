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


// =========================================================
// POS / VENTA PRESENCIAL
// =========================================================

export interface VentaPosItemRequest {
  idProductoTalla: number;
  cantidad: number;
}

export interface VentaPosRequest {
  idClientePresencial: number;
  medioPago: 'EFECTIVO' | 'YAPE' | 'TARJETA';
  items: VentaPosItemRequest[];
}

export interface VentaPosResponse {
  idVenta: number;
  fechaVenta: string;

  tipoVenta: string;

  idClientePresencial: number;

  nombreCliente: string;
  apellidoCliente: string | null;

  tipoDocumento: string;
  numeroDocumento: string;

  telefonoCliente: string | null;
  correoCliente: string | null;

  subtotal: number;
  costoDelivery: number;
  total: number;

  medioPago: string;
  estado: string;
  estadoPedido: string;

  mensaje: string;
}
