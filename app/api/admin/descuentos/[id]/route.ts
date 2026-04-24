import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  nombre:      z.string().min(1).optional(),
  tipo:        z.enum(["PORCENTAJE", "2X1", "PRECIO_ESPECIAL", "DESCUENTO_GLOBAL"]).optional(),
  valor:       z.number().min(0).optional(),
  categoriaId: z.number().int().nullable().optional(),
  productoId:  z.number().int().nullable().optional(),
  diasSemana:  z.string().nullable().optional(),
  horaDesde:   z.string().nullable().optional(),
  horaHasta:   z.string().nullable().optional(),
  activo:      z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { localId } = admin;

  const { id } = await params;
  const existe = await prisma.reglaDescuento.findFirst({
    where: { id: Number(id), localId },
  });
  if (!existe) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const regla = await prisma.reglaDescuento.update({
    where: { id: Number(id) },
    data: parsed.data,
  });

  return NextResponse.json(regla);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { localId } = admin;

  const { id } = await params;
  const existe = await prisma.reglaDescuento.findFirst({
    where: { id: Number(id), localId },
  });
  if (!existe) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.reglaDescuento.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
