import { CompraRequest } from '../../../core/models/venta';
// Huella de reintento, no copia de direccion ni credenciales. La autorizacion sigue en Spring Boot.
let cola: Promise<unknown> = Promise.resolve();
export function clavePrivada(
  request: CompraRequest,
  storageKey: string,
  storage: Storage = sessionStorage,
): Promise<string> {
  const tarea = cola.then(async () => {
    const body = JSON.stringify({ ...request, claveIdempotencia: undefined });
    let previo: {
      body?: string;
      huella?: string;
      key?: string;
      requiereRevision?: boolean;
    } | null = null;
    try {
      previo = JSON.parse(storage.getItem(storageKey) ?? 'null');
    } catch {
      /* No reutilizar datos corruptos. */
    }
    if (previo?.requiereRevision) throw Error('Reintento legado pendiente de revision segura.');
    // Migrar inmediatamente el formato legado que contenia la direccion en claro.
    if (previo?.body) storage.removeItem(storageKey);
    if (!crypto.subtle) throw Error('Se requiere HTTPS para proteger el reintento de compra.');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
    const huella = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
    let key =
      previo &&
      typeof previo.key === 'string' &&
      uuid.test(previo.key) &&
      (previo.huella === huella || previo.body === body)
        ? previo.key
        : null;
    if (!key) {
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 15) | 64;
      b[8] = (b[8] & 63) | 128;
      const h = Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
      key = [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join(
        '-',
      );
    }
    storage.setItem(storageKey, JSON.stringify({ version: 2, huella, key }));
    return key;
  });
  cola = tarea.catch(() => {});
  return tarea;
}
export function migrarDireccionesLegadas(storage: Storage = sessionStorage): Promise<void> {
  const tarea = cola.then(async () => {
    for (const key of ['sebas.yape.intento', 'sebas.transferencia.intento']) {
      let previo: { body?: string; key?: string } | null = null;
      try {
        previo = JSON.parse(storage.getItem(key) ?? 'null');
      } catch {
        storage.removeItem(key);
      }
      if (typeof previo?.body !== 'string') continue;
      storage.setItem(key, JSON.stringify({ version: 2, key: previo.key, requiereRevision: true }));
      if (!crypto.subtle) continue;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(previo.body));
      const huella = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
      storage.setItem(key, JSON.stringify({ version: 2, key: previo.key, huella }));
    }
  });
  cola = tarea.catch(() => {});
  return tarea;
}
