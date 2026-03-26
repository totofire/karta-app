import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.localId || session.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { localId } = session;
  const { id } = await params;

  // Verificar ownership: el retiro debe pertenecer a un turno del local
  const retiro = await prisma.retiro.findFirst({
    where: { id: Number(id), turno: { localId } },
    select: { id: true },
  });

  if (!retiro) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.retiro.delete({ where: { id: retiro.id } });

  return NextResponse.json({ ok: true });
}
