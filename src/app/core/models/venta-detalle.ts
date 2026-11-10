import { ProductoTalla } from './producto-talla';

export interface Venta {
  idVenta: number;
  tipoVenta: 'ONLINE' | 'PRESENCIAL';
  idUsuario: number | null;
  idClientePresencial: number | null;
  nombreCliente: string;
  apellidoCliente: string | null;
  correoCliente: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  fechaVenta: string;
  total: number;
  estado: string;
  estadoPedido: string;
  medioPago: string;
}

export interface DetalleVenta {
  idDetalleVenta: number;
  idVenta: number;
  productoTalla: ProductoTalla;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DireccionEnvioResponse {
  id: number;
  departamento: string;
  provincia: string;
  distrito: string;
  direccionExacta: string;
  referencia: string | null;
  costoDelivery: number;
}

export interface DetalleCompraResponse {
  idVenta: number;
  fechaVenta: string;
  tipoVenta: 'ONLINE' | 'PRESENCIAL';
  subtotal: number;
  costoDelivery: number;
  total: number;
  estado: string;
  estadoPedido: string;
  medioPago: string;
  idUsuario: number | null;
  idClientePresencial: number | null;
  nombreCliente: string;
  apellidoCliente: string | null;
  correoCliente: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  telefonoCliente: string | null;
  direccionEnvio: DireccionEnvioResponse | null;
  detalles: DetalleVenta[];
}