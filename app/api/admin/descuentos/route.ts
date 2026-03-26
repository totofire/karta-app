import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reglaSchema = z.object({
  nombre:      z.string().min(1),
  tipo:        z.enum(["PORCENTAJE", "2X1", "PRECIO_ESPECIAL", "DESCUENTO_GLOBAL"]),
  valor:       z.number().min(0).default(0),
  categoriaId: z.number().int().nullable().optional(),
  productoId:  z.number().int().nullable().optional(),
  diasSemana:  z.string().nullable().optional(),
  horaDesde:   z.string().nullable().optional(),
  horaHasta:   z.string().nullable().optional(),
});

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const reglas = await prisma.reglaDescuento.findMany({
    where: { localId },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(reglas);
}

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = reglaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const regla = await prisma.reglaDescuento.create({
    data: { ...parsed.data, localId },
  });

  return NextResponse.json(regla, { status: 201 });
}
