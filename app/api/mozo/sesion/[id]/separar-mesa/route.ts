import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { separarMesa } from "@/lib/sesiones/mesas";

const ROLES_PERMITIDOS = ["MOZO", "ADMIN", "SUPER_ADMIN"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !ROLES_PERMITIDOS.includes(session.rol) || !session.localId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sesionPrincipalId = Number(id);
  if (isNaN(sesionPrincipalId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json();
  const mesaUnidaId = Number(body.mesaUnidaId);
  if (!mesaUnidaId || isNaN(mesaUnidaId)) {
    return NextResponse.json({ error: "Falta mesaUnidaId" }, { status: 400 });
  }

  try {
    await separarMesa({
      sesionPrincipalId,
      mesaUnidaId,
      localId: session.localId,
      ejecutadoPor: session.userId,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : "Error al separar mesa";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
