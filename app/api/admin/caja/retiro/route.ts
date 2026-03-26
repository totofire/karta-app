import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.localId || session.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { localId } = session;

  const turno = await prisma.turno.findFirst({
    where: { localId, fechaCierre: null },
    select: { id: true },
  });

  if (!turno) {
    return NextResponse.json({ error: "No hay turno abierto" }, { status: 404 });
  }

  const body = await request.json();
  const monto = Number(body.monto);
  const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : "";

  if (!descripcion || isNaN(monto) || monto <= 0) {
    return NextResponse.json({ error: "Monto y descripción requeridos" }, { status: 400 });
  }

  const retiro = await prisma.retiro.create({
    data: { turnoId: turno.id, monto, descripcion },
  });

  return NextResponse.json(retiro, { status: 201 });
}
