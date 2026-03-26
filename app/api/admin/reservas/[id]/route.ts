import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  nombre:   z.string().min(1).optional(),
  telefono: z.string().nullable().optional(),
  fecha:    z.string().datetime().optional(),
  personas: z.number().int().min(1).optional(),
  notas:    z.string().nullable().optional(),
  mesaId:   z.number().int().nullable().optional(),
  estado:   z.enum(["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const existe = await prisma.reserva.findFirst({ where: { id: Number(id), localId } });
  if (!existe) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body   = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.fecha) data.fecha = new Date(parsed.data.fecha);

  const reserva = await prisma.reserva.update({
    where: { id: Number(id) },
    data,
    include: { mesa: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(reserva);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const existe = await prisma.reserva.findFirst({ where: { id: Number(id), localId } });
  if (!existe) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.reserva.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
