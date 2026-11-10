export interface Genero {
  idGenero: number;
  nombreGenero: string;
  estado: boolean;
}

export interface Categoria {
  idCategoria: number;
  nombreCategoria: string;
  estado: boolean;
}

export interface Producto {
  idProducto: number;
  nombre: string;
  descripcion: string;
  precio: number;
  precioOferta: number | null;
  genero: Genero;
  categoria: Categoria;
  imagen: string | null;
  nuevo: boolean;
  destacado: boolean;
  estado: boolean;
}