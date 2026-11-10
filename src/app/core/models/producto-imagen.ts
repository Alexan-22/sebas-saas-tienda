import { Producto } from './producto';

export interface ProductoImagen {
  idProductoImagen: number;
  producto: Producto;
  imagen: string;
  orden: number;
}
