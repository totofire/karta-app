import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { localId } = admin;

  const config = await prisma.configuracion.findUnique({
    where: { localId },
    select: { usaStock: true, horaApertura: true, horaCierre: true, alertaKdsMinutos: true },
  });

  return NextResponse.json(config ?? { usaStock: false, alertaKdsMinutos: 15 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { localId } = admin;

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (typeof body.usaStock === "boolean") data.usaStock = body.usaStock;
  if (typeof body.horaApertura === "string") data.horaApertura = body.horaApertura;
  if (typeof body.horaCierre === "string") data.horaCierre = body.horaCierre;
  if (typeof body.alertaKdsMinutos === "number" && body.alertaKdsMinutos >= 1) data.alertaKdsMinutos = body.alertaKdsMinutos;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Sin datos para actualizar" }, { status: 400 });
  }

  const config = await prisma.configuracion.upsert({
    where: { localId },
    update: data,
    create: { localId, ...data },
  });

  return NextResponse.json(config);
}
