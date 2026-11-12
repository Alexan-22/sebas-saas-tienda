
export interface Perfil {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  tiendaId: number | null;
  estado: boolean;
}

export interface ActualizarPerfilRequest {
  nombre: string;
  apellido: string;
}

export interface CambiarContrasenaRequest {
  contrasenaActual: string;
  contrasenaNueva: string;
  confirmarContrasena: string;
}
