export interface HomeBanner {
  idBanner: number;
  etiqueta: string | null;
  titulo: string;
  descripcion: string | null;
  textoBoton: string | null;
  enlaceBoton: string | null;
  imagen: string | null;
  orden: number;
  estado: boolean;
}

export interface HomeColeccion {
  idColeccion: number;
  titulo: string;
  etiqueta: string | null;
  textoBoton: string | null;
  enlace: string | null;
  imagen: string | null;
  orden: number;
  estado: boolean;
}