import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastSesion } from "@/lib/broadcast";

const METODOS_VALIDOS = ["QR", "TARJETA", "EFECTIVO"] as const;
type MetodoPago = typeof METODOS_VALIDOS[number];

export async function POST(req: Request) {
  try {
    const { tokenEfimero, metodoPago } = await req.json();

    if (!tokenEfimero) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    if (!METODOS_VALIDOS.includes(metodoPago)) {
      return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 });
    }

    const sesionActualizada = await prisma.sesion.update({
      where: { tokenEfimero },
      data: {
        solicitaCuenta: new Date(),
        metodoPago,
      },
      select: { id: true, localId: true, mesaId: true },
    });

    await broadcastSesion(sesionActualizada.localId, "update", {
      sesionId: sesionActualizada.id,
      mesaId: sesionActualizada.mesaId,
      solicitaCuenta: true,
      metodoPago,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}