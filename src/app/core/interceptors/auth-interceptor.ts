import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { environment } from '../../../environments/environment';

function esApiPropia(url: string): boolean {
  if (url.startsWith('/api/')) return true;
  if (!environment.apiUrl) return false;
  try {
    const api = new URL(environment.apiUrl);
    const destino = new URL(url, window.location.origin);
    return destino.origin === api.origin && destino.pathname.startsWith('/api/');
  } catch { return false; }
}

function tokenExpirado(token: string): boolean {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return true;
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000);
  } catch { return true; }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!esApiPropia(request.url)) return next(request);
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.obtenerToken();
  if (!token) return next(request);
  if (tokenExpirado(token)) {
    auth.logout();
    void router.navigate(['/login']);
    return next(request);
  }
  const autenticada = request.headers.has('Authorization')
    ? request : request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(autenticada).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401) {
      auth.logout();
      void router.navigate(['/login']);
    }
    return throwError(() => error);
  }));
};
