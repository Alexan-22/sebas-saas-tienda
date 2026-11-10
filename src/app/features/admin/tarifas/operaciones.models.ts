/** Modelos locales DEMO. El backend definirá contratos definitivos. */
export type TipoKardex = 'ENTRADA' | 'SALIDA' | 'AJUSTE';
export type EstadoCaja = 'ABIERTA' | 'CERRADA';
export type TipoCajaMovimiento = 'INGRESO' | 'EGRESO';
export type TipoDescuento = 'PORCENTAJE' | 'FIJO';
export type MetodoPago = 'MERCADO_PAGO' | 'YAPE' | 'PLIN';

export interface StockTalla {
  productoId: string;
  producto: string;
  talla: string;
  cantidad: number;
  tiendaId: string;
}
export interface KardexMovimiento {
  id: string; tiendaId: string; fecha: string; productoId: string;
  producto: string; talla: string; tipo: TipoKardex;
  diferencia: number; stockAnterior: number; stockPosterior: number;
  motivo: string; responsable: string;
}
export interface CajaSesion {
  id: string; tiendaId: string; estado: EstadoCaja; responsable: string;
  abiertaEn: string; cerradaEn: string | null; montoInicial: number;
  efectivoContado: number | null; efectivoEsperado: number;
  diferencia: number | null;
}
export interface CajaMovimiento {
  id: string; tiendaId: string; sesionId: string; fecha: string;
  tipo: TipoCajaMovimiento; concepto: string; importe: number;
}
export interface TarifaEnvio {
  id: string; tiendaId: string; departamento: string; provincia: string;
  distrito: string; precio: number; diasMin: number; diasMax: number;
  activa: boolean;
}
export interface Cupon {
  id: string; tiendaId: string; codigo: string; tipo: TipoDescuento;
  valor: number; compraMinima: number; limiteUsos: number;
  usos: number; inicio: string; fin: string; activo: boolean;
}
export interface AuditoriaEvento {
  id: string; tiendaId: string; fecha: string; modulo: string;
  accion: string; descripcion: string; actor: string;
}
export interface PagoPreparado {
  id: string; tiendaId: string; pedidoReferencia: string;
  metodo: MetodoPago; monto: number; creadoEn: string;
  estado: 'SIMULADO_SIN_COBRO';
}
export interface OperacionesEstado {
  version: 1;
  stocks: StockTalla[];
  kardex: KardexMovimiento[];
  cajas: CajaSesion[];
  movimientosCaja: CajaMovimiento[];
  tarifas: TarifaEnvio[];
  cupones: Cupon[];
  auditoria: AuditoriaEvento[];
  pagos: PagoPreparado[];
}

export function fechaLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dineroValido(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && Math.abs(Math.round(n * 100) - n * 100) < 1e-7;
}
export function exportarCsv(nombre: string, encabezados: string[], filas: (string | number | boolean | null)[][]): void {
  const escapar = (valor: string | number | boolean | null) => {
    const texto = String(valor ?? '');
    // Evitar ejecución de fórmulas al abrir CSV en Excel.
    const seguro = /^[\s]*[=+@\-\t\r]/.test(texto) ? `'${texto}` : texto;
    return `"${seguro.replace(/"/g, '""')}"`;
  };
  const contenido = [encabezados, ...filas].map(fila => fila.map(escapar).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', contenido], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
