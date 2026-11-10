export interface ItemPagoDTO {
  id: string;
  titulo: string;
  cantidad: number;
  precioUnitario: number;
}

export interface PagoRequestDTO {
  items: ItemPagoDTO[];
}

export interface PagoResponseDTO {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}