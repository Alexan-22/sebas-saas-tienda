export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  nombre: string;
  correo: string;
  rol: string;
}

export interface RegistroRequest {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
}