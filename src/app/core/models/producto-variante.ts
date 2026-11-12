export type TipoVarianteProducto =
  | 'SIN_VARIANTES'
  | 'SOLO_COLOR'
  | 'SOLO_TALLA'
  | 'COLOR_Y_TALLA';

export type SistemaTallas =
  | 'SIN_TALLA'
  | 'LETRAS'
  | 'CINTURA'
  | 'CUELLO'
  | 'TRAJES'
  | 'CALZADO'
  | 'MUJER_NUMERICA'
  | 'LENCERIA'
  | 'BEBES'
  | 'INFANTIL'
  | 'HOGAR'
  | 'PERSONALIZADO';

export interface ColorProducto {
  idColor: number;
  nombre: string;
  codigoHex: string | null;
  activo: boolean;
}

export interface VarianteProducto {
  idVariante: number;
  idProducto: number;
  idColor: number | null;
  idTalla: number | null;
  nombreColor: string | null;
  nombreTalla: string | null;
  sku: string | null;
  stock: number;
  activo: boolean;
}

export interface ConfiguracionVariantesProducto {
  tipo: TipoVarianteProducto;
  sistemaTallas: SistemaTallas;
  colores: ColorProducto[];
  variantes: VarianteProducto[];
}

export const GUIAS_TALLAS: Record<SistemaTallas, string[]> = {
  SIN_TALLA: [],
  LETRAS: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  CINTURA: ['26', '28', '30', '32', '34', '36', '38', '40', '42'],
  CUELLO: ['14.5', '15', '15.5', '16', '16.5', '17', '17.5'],
  TRAJES: [
    '36R', '38R', '40R', '42R', '44R', '46R',
    '36L', '38L', '40L', '42L', '44L', '46L'
  ],
  CALZADO: Array.from(
    { length: 31 },
    (_, i) => String(i + 16)
  ),
  MUJER_NUMERICA: ['4', '6', '8', '10', '12', '14', '16'],
  LENCERIA: ['32B', '34B', '34C', '36B', '36C', '38C'],
  BEBES: [
    '0-3M', '3-6M', '6-9M',
    '9-12M', '12-18M', '18-24M'
  ],
  INFANTIL: ['2', '4', '6', '8', '10', '12', '14', '16'],
  HOGAR: ['1.5 plazas', '2 plazas', 'Queen', 'King'],
  PERSONALIZADO: []
};

export function usaColor(tipo: TipoVarianteProducto): boolean {
  return tipo === 'SOLO_COLOR' || tipo === 'COLOR_Y_TALLA';
}

export function usaTalla(tipo: TipoVarianteProducto): boolean {
  return tipo === 'SOLO_TALLA' || tipo === 'COLOR_Y_TALLA';
}