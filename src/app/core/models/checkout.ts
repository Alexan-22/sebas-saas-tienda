export type MetodoPago =
  | 'YAPE'
  | 'TRANSFERENCIA';


export interface DatosCheckout {

  nombres: string;

  apellidos: string;

  telefono: string;

  departamento: string;

  provincia: string;

  distrito: string;

  direccion: string;

  referencia: string;

  metodoPago: MetodoPago;
}
