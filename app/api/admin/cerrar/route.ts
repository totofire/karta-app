import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { sesionId } = await req.json();

  if (!sesionId) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

  // 1. Buscamos la sesión para calcular el total final exacto
  const sesion = await prisma.sesion.findUnique({
    where: { id: sesionId },
    include: { pedidos: { include: { items: true } } }
  });

  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  // 2. Calculadora final
  let totalFinal = 0;
  sesion.pedidos.forEach(p => {
    if (p.estado !== "CANCELADO") {
      p.items.forEach(i => totalFinal += i.precio * i.cantidad);
    }
  });

  // 3. ¡EL CIERRE! Ponemos fecha de fin y guardamos la plata
  await prisma.sesion.update({
    where: { id: sesionId },
    data: {
      fechaFin: new Date(),
      totalVenta: totalFinal
    }
  });

  return NextResponse.json({ success: true, recaudado: totalFinal });
}