import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const sesionId = parseInt(id, 10);
  if (isNaN(sesionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const sesion = await prisma.sesion.findFirst({
    where: { id: sesionId, localId },
    include: {
      pedidos: {
        where: { estado: { not: "CANCELADO" } },
        orderBy: { fecha: "asc" },
        include: {
          items: {
            orderBy: { id: "asc" },
            include: {
              producto: { select: { nombre: true } },
            },
          },
        },
      },
    },
  });

  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  return NextResponse.json(sesion);
}
