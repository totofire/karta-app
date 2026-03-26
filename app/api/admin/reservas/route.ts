import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reservaSchema = z.object({
  nombre:   z.string().min(1),
  telefono: z.string().nullable().optional(),
  fecha:    z.string().datetime(),
  personas: z.number().int().min(1),
  notas:    z.string().nullable().optional(),
  mesaId:   z.number().int().nullable().optional(),
});

export async function GET(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha"); // YYYY-MM-DD

  const where: Record<string, unknown> = { localId };

  if (fecha) {
    const inicio = new Date(`${fecha}T00:00:00.000Z`);
    const fin    = new Date(`${fecha}T23:59:59.999Z`);
    where.fecha  = { gte: inicio, lte: fin };
  }

  const reservas = await prisma.reserva.findMany({
    where,
    include: { mesa: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json(reservas);
}

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body   = await req.json();
  const parsed = reservaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const reserva = await prisma.reserva.create({
    data: {
      ...parsed.data,
      fecha:  new Date(parsed.data.fecha),
      localId,
    },
    include: { mesa: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(reserva, { status: 201 });
}
