import { claveYape, completarIntentoYape } from './yape/yape-idempotencia';
import { claveTransferencia } from './transferencia/transferencia-idempotencia';
import { migrarDireccionesLegadas } from './clave-privada';
import { CompraRequest } from '../../../core/models/venta';
describe('Privacidad e idempotencia checkout', () => {
  const request: CompraRequest = {
    medioPago: 'YAPE',
    items: [{ idProductoTalla: 1, cantidad: 1 }],
    direccionEnvio: {
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Ficticio',
      direccionExacta: 'DOMICILIO_PRIVADO_FICTICIO',
      referencia: 'REFERENCIA_PRIVADA',
    },
  };
  beforeEach(() => sessionStorage.clear());
  it('solo persiste huella y UUID, sin direccion ni campos privados', async () => {
    const key = await claveYape(request);
    const stored = sessionStorage.getItem('sebas.yape.intento')!;
    expect(stored).toContain(key);
    expect(stored).not.toContain('PRIVAD');
    expect(stored).not.toContain('direccion');
    expect(JSON.parse(stored).huella).toMatch(/^[a-f0-9]{64}$/);
  });
  it('migra intentos legados conservando la clave de una compra ya enviada', async () => {
    const key = '12345678-1234-4234-8234-123456789abc';
    sessionStorage.setItem(
      'sebas.yape.intento',
      JSON.stringify({ key, body: JSON.stringify({ ...request, claveIdempotencia: undefined }) }),
    );
    await migrarDireccionesLegadas();
    expect(sessionStorage.getItem('sebas.yape.intento')).not.toContain('PRIVAD');
    expect(await claveYape(structuredClone(request))).toBe(key);
  });
  it('solicitudes concurrentes conservan una sola clave', async () => {
    const [a, b] = await Promise.all([claveYape(request), claveYape(structuredClone(request))]);
    expect(a).toBe(b);
  });
  it('medios distintos no reutilizan la misma clave y transferencias tampoco guardan direccion', async () => {
    const a = await claveYape(request),
      b = await claveTransferencia({ ...request, medioPago: 'TRANSFERENCIA', cuentaBancariaId: 1 });
    expect(a).not.toBe(b);
    expect(sessionStorage.getItem('sebas.transferencia.intento')).not.toContain('DOMICILIO');
  });
  it('solo exito elimina el intento, sin afectar transferencias', async () => {
    const a = await claveYape(request),
      b = await claveTransferencia({ ...request, medioPago: 'TRANSFERENCIA' });
    completarIntentoYape();
    expect(await claveYape(request)).not.toBe(a);
    expect(await claveTransferencia({ ...request, medioPago: 'TRANSFERENCIA' })).toBe(b);
  });
});
