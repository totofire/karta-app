import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    await prisma.sesion.update({
      where: { tokenEfimero },
      data: {
        solicitaCuenta: new Date(),
        metodoPago,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}