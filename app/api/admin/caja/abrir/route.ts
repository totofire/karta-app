import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.localId || session.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { localId, userId } = session;

  const turnoActivo = await prisma.turno.findFirst({
    where: { localId, fechaCierre: null },
    select: { id: true },
  });

  if (turnoActivo) {
    return NextResponse.json({ error: "Ya hay un turno abierto" }, { status: 409 });
  }

  const body = await request.json();
  const efectivoInicial = Number(body.efectivoInicial ?? 0);
  const notas = typeof body.notas === "string" ? body.notas.trim() || null : null;

  if (isNaN(efectivoInicial) || efectivoInicial < 0) {
    return NextResponse.json({ error: "Efectivo inicial inválido" }, { status: 400 });
  }

  const turno = await prisma.turno.create({
    data: { localId, creadoPor: userId, efectivoInicial, notas },
  });

  return NextResponse.json(turno, { status: 201 });
}
