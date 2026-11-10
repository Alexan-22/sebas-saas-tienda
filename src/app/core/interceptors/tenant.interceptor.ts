import { HttpInterceptorFn } from '@angular/common/http';

// La identificación confiable del tenant ocurre en Spring Boot por host validado.
// X-Tenant-Domain desde el navegador no debe otorgar acceso a otra tienda.
export const tenantInterceptor: HttpInterceptorFn = (request, next) => next(request);
