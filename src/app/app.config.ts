import { migrarDireccionesLegadas } from './features/checkout/idempotencia/clave-privada';
import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => migrarDireccionesLegadas().catch(() => {})),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    provideHttpClient(
      withInterceptors([tenantInterceptor, authInterceptor])
    )
  ]
};