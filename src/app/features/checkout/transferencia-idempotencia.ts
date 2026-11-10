import { CompraRequest } from '../../core/models/venta';
const storageKey = 'sebas.transferencia.intento';
// Session-only metadata; no token or credentials. Failed HTTP responses retain the key.
export function claveTransferencia(request: CompraRequest, storage: Storage = sessionStorage): string {
  const body = JSON.stringify({ ...request, claveIdempotencia: undefined });
  let previous: { body: string; key: string } | null = null;
  try { previous = JSON.parse(storage.getItem(storageKey) ?? 'null'); } catch { /* damaged local cache */ }
  if (previous?.body === body && typeof previous.key === 'string') return previous.key;
  // getRandomValues also works on local HTTP test hostnames (randomUUID requires HTTPS).
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const key = [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  storage.setItem(storageKey, JSON.stringify({ body, key }));
  return key;
}
export function completarIntentoTransferencia(storage: Storage = sessionStorage): void { storage.removeItem(storageKey); }
