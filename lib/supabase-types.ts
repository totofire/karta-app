export interface PedidoPayload {
  id?: number;
  sesionId?: number;
  localId?: number;
  nombreCliente?: string;
  estado?: string;
  fecha?: string;
  impreso?: boolean;
  fechaDespacho?: string | null;
}

export interface SesionPayload {
  id?: number;
  mesaId?: number;
  localId?: number;
  fechaInicio?: string;
  fechaFin?: string | null;
  totalVenta?: number;
  nombreHost?: string;
  tokenEfimero?: string;
  expiraEn?: string | null;
  solicitaCuenta?: string | null;
  metodoPago?: string | null;
}
