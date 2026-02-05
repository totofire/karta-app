import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { tokenEfimero } = await req.json();

    if (!tokenEfimero) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Actualizamos la sesión para marcar que pidió la cuenta
    await prisma.sesion.update({
      where: { tokenEfimero },
      data: { solicitaCuenta: new Date() }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}