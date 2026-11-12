import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

// ==============================================
// SEBAS COLLECTION SAAS
// RBAC MULTI-TENANT - ADMINISTRACION DE TIENDA
// ==============================================

export interface RbacPermiso {
  codigo: string;
  descripcion: string;
}

export interface RbacRol {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creado_en: string;
}

export interface CrearRolRbac {
  nombre: string;
  descripcion: string;
  permisos: string[];
}

export interface RolCreadoRbac {
  id: number;
  nombre: string;
  permisos: string[];
  activo: boolean;
}

export interface CrearEmpleadoRbac {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
}

export interface EmpleadoRbac {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  activo: boolean;
}

export interface RolAsignadoRbac {
  id: number;
  nombre: string;
  [campo: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class RbacService {

  private readonly http = inject(HttpClient);

  private readonly api =
    `${environment.apiUrl}/api/rbac/admin`;

  // ==========================================
  // CATALOGO DE PERMISOS
  // ==========================================

  listarPermisos(): Observable<RbacPermiso[]> {
    return this.http.get<RbacPermiso[]>(
      `${this.api}/permisos`
    );
  }

  // ==========================================
  // ROLES DE LA TIENDA
  // ==========================================

  listarRoles(): Observable<RbacRol[]> {
    return this.http.get<RbacRol[]>(
      `${this.api}/roles`
    );
  }

  permisosDeRol(
    rolId: number
  ): Observable<RbacPermiso[]> {
    return this.http.get<RbacPermiso[]>(
      `${this.api}/roles/${rolId}/permisos`
    );
  }

  crearRol(
    datos: CrearRolRbac
  ): Observable<RolCreadoRbac> {
    return this.http.post<RolCreadoRbac>(
      `${this.api}/roles`,
      datos
    );
  }

  // ==========================================
  // EMPLEADOS
  // ==========================================

  listarEmpleados(): Observable<EmpleadoRbac[]> {
    return this.http.get<EmpleadoRbac[]>(
      `${this.api}/empleados`
    );
  }

  crearEmpleado(
    datos: CrearEmpleadoRbac
  ): Observable<EmpleadoRbac> {
    return this.http.post<EmpleadoRbac>(
      `${this.api}/empleados`,
      datos
    );
  }

  // ==========================================
  // ASIGNACION DE ROLES
  // ==========================================

  rolesDeEmpleado(
    usuarioId: number
  ): Observable<RolAsignadoRbac[]> {
    return this.http.get<RolAsignadoRbac[]>(
      `${this.api}/empleados/${usuarioId}/roles`
    );
  }

  asignarRol(
    usuarioId: number,
    rolId: number
  ): Observable<void> {
    return this.http.post<void>(
      `${this.api}/empleados/${usuarioId}/roles/${rolId}`,
      null
    );
  }

  revocarRol(
    usuarioId: number,
    rolId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/empleados/${usuarioId}/roles/${rolId}`
    );
  }
}