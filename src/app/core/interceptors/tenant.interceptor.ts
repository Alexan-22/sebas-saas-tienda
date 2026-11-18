import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const AMY_HOST = 'orange-glacier-07243c91e.6.azurestaticapps.net';

export const tenantInterceptor: HttpInterceptorFn = (request, next) => {
  if (
    typeof window === 'undefined' ||
    window.location.hostname.toLowerCase() !== AMY_HOST ||
    !environment.apiUrl
  ) {
    return next(request);
  }

  try {
    const api = new URL(environment.apiUrl);
    const destino = new URL(request.url, window.location.origin);

    if (
      destino.origin !== api.origin ||
      !destino.pathname.startsWith('/api/')
    ) {
      return next(request);
    }

    return next(request.clone({
      setHeaders: {
        'X-Storefront-Slug': 'amyfashion'
      }
    }));
  } catch {
    return next(request);
  }
};