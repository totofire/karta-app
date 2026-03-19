import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const config = await prisma.configuracion.findUnique({
    where: { localId: session.localId },
    select: { cajaAbierta: true },
  });

  return NextResponse.json({ cajaAbierta: config?.cajaAbierta ?? true });
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const config = await prisma.configuracion.findUnique({
    where: { localId: session.localId },
    select: { cajaAbierta: true },
  });

  const nuevo = !(config?.cajaAbierta ?? true);

  const updated = await prisma.configuracion.update({
    where: { localId: session.localId },
    data: { cajaAbierta: nuevo },
  });

  return NextResponse.json({ cajaAbierta: updated.cajaAbierta });
}
