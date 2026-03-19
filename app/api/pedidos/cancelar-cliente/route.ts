import { NextResponse } from "next/server";

// La cancelación por parte del cliente fue deshabilitada.
// Si necesitás cancelar un pedido, pedile al mozo.
export async function POST() {
  return NextResponse.json(
    { error: "La cancelación de pedidos no está disponible. Pedile al mozo." },
    { status: 410 },
  );
}
