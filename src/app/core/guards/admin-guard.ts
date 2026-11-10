import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  /*
   * No inició sesión
   */
  if (!authService.autenticado()) {
    return router.createUrlTree(
      ['/login'],
      {
        queryParams: {
          returnUrl: state.url
        }
      }
    );
  }

  /*
   * Obtener rol desde JWT
   */
  const rol = authService
    .obtenerRol()
    ?.toUpperCase();

  /*
   * Es administrador
   */
  if (rol === 'ADMIN') {
    return true;
  }

  /*
   * Usuario autenticado pero
   * sin permisos administrativos
   */
  return router.createUrlTree(['/']);
};