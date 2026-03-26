import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MOTIVOS_VALIDOS = ["SERVILLETAS", "ADEREZOS", "CUBIERTOS", "CONSULTA", "OTRO"] as const;
type Motivo = (typeof MOTIVOS_VALIDOS)[number];

// Cliente llama al mozo
export async function POST(request: Request) {
  const body = await request.json();
  const { tokenEfimero, motivo } = body;

  if (!tokenEfimero || !MOTIVOS_VALIDOS.includes(motivo as Motivo)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const sesion = await prisma.sesion.findUnique({
    where: { tokenEfimero },
    select: { id: true, fechaFin: true, llamadaMozo: true },
  });

  if (!sesion || sesion.fechaFin) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 404 });
  }

  if (sesion.llamadaMozo) {
    return NextResponse.json({ error: "Ya hay un llamado activo" }, { status: 409 });
  }

  await prisma.sesion.update({
    where: { id: sesion.id },
    data: { llamadaMozo: motivo },
  });

  return NextResponse.json({ ok: true });
}

// Mozo descarta el llamado
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.localId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { sesionId } = body;

  if (!sesionId) {
    return NextResponse.json({ error: "sesionId requerido" }, { status: 400 });
  }

  const sesion = await prisma.sesion.findFirst({
    where: { id: Number(sesionId), localId: session.localId },
    select: { id: true },
  });

  if (!sesion) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  await prisma.sesion.update({
    where: { id: sesion.id },
    data: { llamadaMozo: null },
  });

  return NextResponse.json({ ok: true });
}
