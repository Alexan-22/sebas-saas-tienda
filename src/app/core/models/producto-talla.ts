import { Producto } from './producto';

export interface Talla {
  idTalla: number;
  nombreTalla: string;
  estado: boolean;
}

export interface ProductoTalla {
  idProductoTalla: number;
  idColor?: number | null;
  producto: Producto;
  talla: Talla;
  stock: number;
}