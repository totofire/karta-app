import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const turnoActivo = await prisma.turno.findFirst({
    where: { localId: session.localId, fechaCierre: null },
    select: { id: true },
  });

  return NextResponse.json({ cajaAbierta: turnoActivo !== null });
}
