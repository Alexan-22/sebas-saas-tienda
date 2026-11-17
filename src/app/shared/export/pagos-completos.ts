import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { defer, EMPTY, expand, map, Observable, reduce } from 'rxjs';
interface Pagina<T> {
  registros: T[];
  siguienteCursor: number | null;
  hasMore: boolean;
}
/** Solo lectura; cualquier pagina incompleta/incompatible impide exportar una tabla parcial. */
export function leerPagosCompletos<T extends { idVenta: number }>(
  http: HttpClient,
  url: string,
): Observable<T[]> {
  return defer(() => {
    const ids = new Set<number>();
    let paginas = 0,
      anterior = 2147483648;
    const fallo = () =>
      new HttpErrorResponse({
        status: 409,
        statusText: 'No se pudo obtener un reporte completo de pagos.',
      });
    const pedir = (cursor?: number) => {
      let params = new HttpParams().set('size', 100);
      if (cursor !== undefined) params = params.set('cursor', cursor);
      return http.get<Pagina<T>>(url, { params }).pipe(
        map((p) => {
          if (
            ++paginas > 1000 ||
            !p ||
            !Array.isArray(p.registros) ||
            p.registros.length > 100 ||
            typeof p.hasMore !== 'boolean'
          )
            throw fallo();
          for (const r of p.registros) {
            if (
              !Number.isInteger(r.idVenta) ||
              r.idVenta < 1 ||
              r.idVenta >= anterior ||
              ids.has(r.idVenta)
            )
              throw fallo();
            ids.add(r.idVenta);
            anterior = r.idVenta;
          }
          if (
            p.hasMore
              ? !p.registros.length || p.siguienteCursor !== anterior
              : p.siguienteCursor !== null
          )
            throw fallo();
          return p;
        }),
      );
    };
    return pedir().pipe(
      expand((p) => (p.hasMore ? pedir(p.siguienteCursor!) : EMPTY), 1),
      reduce((all, p) => all.concat(p.registros), [] as T[]),
    );
  });
}
