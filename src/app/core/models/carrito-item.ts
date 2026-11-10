export interface CarritoItem {
  idProducto: number;
  idProductoTalla: number;
  nombre: string;
  talla: string;
  imagen: string | null;
  precio: number;
  cantidad: number;
  stock: number;
}