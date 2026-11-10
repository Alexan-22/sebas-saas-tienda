export interface ClientePresencialRequest {
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  correo: string;
}

export interface ClientePresencialResponse {
  idClientePresencial: number;
  nombre: string;
  apellido: string | null;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string | null;
  correo: string | null;
  fechaRegistro: string;
  estado: boolean;
}