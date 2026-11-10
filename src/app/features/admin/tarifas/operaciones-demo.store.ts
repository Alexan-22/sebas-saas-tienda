import { Injectable, signal } from '@angular/core';
import {
  AuditoriaEvento, CajaMovimiento, CajaSesion, Cupon, dineroValido,
  KardexMovimiento, MetodoPago, OperacionesEstado, PagoPreparado,
  StockTalla, TarifaEnvio, TipoCajaMovimiento, TipoKardex, fechaLocal
} from './operaciones.models';

/**
 * DEMO AISLADA: no llama a Spring Boot y no modifica la base Supabase.
 * En producción sustituir por endpoints seguros y transacciones del servidor.
 */
@Injectable({ providedIn: 'root' })
export class OperacionesDemoStore {
  private readonly clave = 'sebas-ecommerce-operaciones-demo-v1';
  readonly tiendaId = 'SEBAS_DEMO'; // Solo referencia visual, NO autoriza operaciones.
  readonly responsable = 'Operador DEMO';
  private readonly _estado = signal<OperacionesEstado>(this.cargar());
  readonly estado = this._estado.asReadonly();

  private inicial(): OperacionesEstado {
    const stocks: StockTalla[] = [
      { productoId: 'PROD-DEMO-1', producto: 'Vestido floral (ejemplo)', talla: 'S', cantidad: 12, tiendaId: this.tiendaId },
      { productoId: 'PROD-DEMO-1', producto: 'Vestido floral (ejemplo)', talla: 'M', cantidad: 8, tiendaId: this.tiendaId },
      { productoId: 'PROD-DEMO-2', producto: 'Blusa clásica (ejemplo)', talla: 'L', cantidad: 15, tiendaId: this.tiendaId }
    ];
    return {
      version: 1, stocks, kardex: [], cajas: [], movimientosCaja: [],
      tarifas: [], cupones: [], auditoria: [], pagos: []
    };
  }

  private cargar(): OperacionesEstado {
    try {
      const raw = localStorage.getItem(this.clave);
      if (raw) {
        const candidato: unknown = JSON.parse(raw);
        if (this.esEstado(candidato)) return candidato;
      }
    } catch { /* Sesión sin almacenamiento disponible: trabajar en memoria. */ }
    return this.inicial();
  }

  private esEstado(v: unknown): v is OperacionesEstado {
    if (!v || typeof v !== 'object') return false;
    const x = v as Record<string, unknown>;
    return x['version'] === 1 && [
      'stocks', 'kardex', 'cajas', 'movimientosCaja', 'tarifas',
      'cupones', 'auditoria', 'pagos'
    ].every(k => Array.isArray(x[k]));
  }

  private guardar(datos: OperacionesEstado): void {
    try { localStorage.setItem(this.clave, JSON.stringify(datos)); }
    catch { /* La interfaz sigue funcionando hasta recargar. */ }
    this._estado.set(datos);
  }

  private audit(modulo: string, accion: string, descripcion: string): AuditoriaEvento {
    return { id: crypto.randomUUID(), tiendaId: this.tiendaId, fecha: new Date().toISOString(), modulo, accion, descripcion, actor: this.responsable };
  }

  registrarKardex(stock: StockTalla, tipo: TipoKardex, cantidad: number, motivo: string): void {
    if (!motivo.trim()) throw new Error('Debes indicar el motivo del movimiento.');
    const base = this.estado();
    const actual = base.stocks.find(s => s.productoId === stock.productoId && s.talla === stock.talla && s.tiendaId === this.tiendaId);
    if (!actual) throw new Error('El producto/talla no existe en este DEMO.');
    if (!Number.isInteger(cantidad) || cantidad < 0 || (tipo !== 'AJUSTE' && cantidad === 0))
      throw new Error('La cantidad debe ser un número entero válido.');
    const posterior = tipo === 'AJUSTE' ? cantidad : actual.cantidad + (tipo === 'ENTRADA' ? cantidad : -cantidad);
    if (posterior < 0) throw new Error('No hay stock suficiente para la salida.');
    if (posterior === actual.cantidad) throw new Error('El movimiento no cambia las existencias.');
    const mov: KardexMovimiento = {
      id: crypto.randomUUID(), tiendaId: this.tiendaId, fecha: new Date().toISOString(),
      productoId: actual.productoId, producto: actual.producto, talla: actual.talla, tipo,
      diferencia: posterior - actual.cantidad, stockAnterior: actual.cantidad, stockPosterior: posterior,
      motivo: motivo.trim(), responsable: this.responsable
    };
    this.guardar({
      ...base, stocks: base.stocks.map(s => s === actual ? { ...s, cantidad: posterior } : s),
      kardex: [mov, ...base.kardex], auditoria: [this.audit('Inventario', tipo, `${actual.producto} talla ${actual.talla}: ${mov.diferencia} unidades`), ...base.auditoria]
    });
  }

  cajaAbierta(): CajaSesion | undefined {
    return this.estado().cajas.find(c => c.tiendaId === this.tiendaId && c.estado === 'ABIERTA');
  }

  abrirCaja(responsable: string, montoInicial: number): void {
    if (this.cajaAbierta()) throw new Error('Ya existe una sesión de caja abierta.');
    if (!responsable.trim() || !dineroValido(montoInicial)) throw new Error('Indica responsable y un monto inicial válido (máximo dos decimales).');
    const base = this.estado();
    const caja: CajaSesion = {
      id: crypto.randomUUID(), tiendaId: this.tiendaId, estado: 'ABIERTA',
      responsable: responsable.trim(), abiertaEn: new Date().toISOString(), cerradaEn: null,
      montoInicial, efectivoEsperado: montoInicial, efectivoContado: null, diferencia: null
    };
    this.guardar({ ...base, cajas: [caja, ...base.cajas], auditoria: [this.audit('Caja', 'APERTURA', `Caja abierta con S/ ${montoInicial.toFixed(2)}`), ...base.auditoria] });
  }

  moverCaja(tipo: TipoCajaMovimiento, concepto: string, importe: number): void {
    const caja = this.cajaAbierta();
    if (!caja) throw new Error('No hay sesión de caja abierta.');
    if (!concepto.trim() || !dineroValido(importe) || importe === 0) throw new Error('Ingresa un concepto y un importe positivo válido.');
    const base = this.estado();
    const esperado = caja.efectivoEsperado + (tipo === 'INGRESO' ? importe : -importe);
    if (esperado < 0) throw new Error('El egreso supera el efectivo esperado.');
    const movimiento: CajaMovimiento = {
      id: crypto.randomUUID(), tiendaId: this.tiendaId, sesionId: caja.id,
      fecha: new Date().toISOString(), tipo, concepto: concepto.trim(), importe
    };
    this.guardar({
      ...base, cajas: base.cajas.map(c => c.id === caja.id ? { ...c, efectivoEsperado: Math.round(esperado * 100) / 100 } : c),
      movimientosCaja: [movimiento, ...base.movimientosCaja],
      auditoria: [this.audit('Caja', tipo, `${concepto.trim()}: S/ ${importe.toFixed(2)}`), ...base.auditoria]
    });
  }

  cerrarCaja(efectivoContado: number): void {
    const caja = this.cajaAbierta();
    if (!caja) throw new Error('No existe caja abierta.');
    if (!dineroValido(efectivoContado)) throw new Error('El efectivo contado debe ser un monto válido.');
    const diferencia = Math.round((efectivoContado - caja.efectivoEsperado) * 100) / 100;
    const base = this.estado();
    this.guardar({
      ...base, cajas: base.cajas.map(c => c.id === caja.id ? { ...c, estado: 'CERRADA', cerradaEn: new Date().toISOString(), efectivoContado, diferencia } : c),
      auditoria: [this.audit('Caja', 'CIERRE', `Arqueo DEMO. Diferencia: S/ ${diferencia.toFixed(2)}`), ...base.auditoria]
    });
  }

  guardarTarifa(entrada: Omit<TarifaEnvio, 'id' | 'tiendaId'>, id?: string): void {
    const d = [entrada.departamento, entrada.provincia, entrada.distrito].map(v => v.trim());
    if (d.some(v => !v)) throw new Error('Departamento, provincia y distrito son obligatorios.');
    if (!dineroValido(entrada.precio) || !Number.isInteger(entrada.diasMin) || !Number.isInteger(entrada.diasMax) || entrada.diasMin < 0 || entrada.diasMax < entrada.diasMin)
      throw new Error('Revisa precio y rango de días de entrega.');
    const base = this.estado();
    if (base.tarifas.some(t => t.id !== id && [t.departamento, t.provincia, t.distrito].every((x, i) => x.toLowerCase() === d[i].toLowerCase())))
      throw new Error('Ya hay una tarifa para este ubigeo DEMO.');
    const tarifa: TarifaEnvio = { ...entrada, departamento: d[0], provincia: d[1], distrito: d[2], tiendaId: this.tiendaId, id: id ?? crypto.randomUUID() };
    this.guardar({
      ...base, tarifas: id ? base.tarifas.map(t => t.id === id ? tarifa : t) : [tarifa, ...base.tarifas],
      auditoria: [this.audit('Envíos', id ? 'EDICION' : 'ALTA', `${d.join(' / ')}: S/ ${tarifa.precio.toFixed(2)}`), ...base.auditoria]
    });
  }

  guardarCupon(entrada: Omit<Cupon, 'id' | 'tiendaId' | 'usos'>, id?: string): void {
    const codigo = entrada.codigo.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(codigo)) throw new Error('Código de 3 a 24 caracteres (A-Z, 0-9, - o _).');
    if (!dineroValido(entrada.compraMinima) || !dineroValido(entrada.valor) || entrada.valor <= 0 || (entrada.tipo === 'PORCENTAJE' && entrada.valor > 100))
      throw new Error('Descuento o compra mínima no válidos.');
    if (!Number.isInteger(entrada.limiteUsos) || entrada.limiteUsos < 1 || entrada.inicio > entrada.fin)
      throw new Error('Revisa límite de usos y fechas.');
    const base = this.estado();
    if (base.cupones.some(c => c.id !== id && c.codigo.toUpperCase() === codigo)) throw new Error('El código ya está registrado.');
    const anterior = base.cupones.find(c => c.id === id);
    if (id && !anterior) throw new Error('Cupón no encontrado.');
    if (anterior && entrada.limiteUsos < anterior.usos) throw new Error('El límite no puede ser inferior a los usos registrados.');
    const cupon: Cupon = { ...entrada, codigo, id: id ?? crypto.randomUUID(), tiendaId: this.tiendaId, usos: anterior?.usos ?? 0 };
    this.guardar({
      ...base, cupones: id ? base.cupones.map(c => c.id === id ? cupon : c) : [cupon, ...base.cupones],
      auditoria: [this.audit('Cupones', id ? 'EDICION' : 'ALTA', `Cupón ${codigo} configurado`), ...base.auditoria]
    });
  }

  probarCupon(codigo: string, subtotal: number): string {
    const c = this.estado().cupones.find(c => c.codigo === codigo.trim().toUpperCase());
    if (!c) return 'Código no encontrado.';
    if (!c.activo) return 'Cupón inactivo.';
    const hoy = fechaLocal();
    if (hoy < c.inicio || hoy > c.fin) return 'Cupón fuera de vigencia.';
    if (c.usos >= c.limiteUsos) return 'Límite de usos alcanzado.';
    if (!Number.isFinite(subtotal) || subtotal < c.compraMinima) return 'La compra no alcanza el mínimo.';
    const descuento = c.tipo === 'PORCENTAJE' ? subtotal * c.valor / 100 : c.valor;
    return `Cupón válido en simulación: ahorro S/ ${Math.min(subtotal, descuento).toFixed(2)}. No se ha aplicado ni consumido.`;
  }

  prepararPago(pedidoReferencia: string, metodo: MetodoPago, monto: number): void {
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(pedidoReferencia.trim())) throw new Error('Referencia alfanumérica de 3 a 64 caracteres.');
    if (!dineroValido(monto) || monto === 0) throw new Error('Ingresa un monto válido mayor que cero.');
    const base = this.estado();
    const pago: PagoPreparado = {
      id: crypto.randomUUID(), tiendaId: this.tiendaId, pedidoReferencia: pedidoReferencia.trim(),
      metodo, monto, creadoEn: new Date().toISOString(), estado: 'SIMULADO_SIN_COBRO'
    };
    this.guardar({ ...base, pagos: [pago, ...base.pagos], auditoria: [this.audit('Pagos', 'SIMULACION', `Intento ${metodo} sin cobro para ${pedidoReferencia.trim()}`), ...base.auditoria] });
  }
}
