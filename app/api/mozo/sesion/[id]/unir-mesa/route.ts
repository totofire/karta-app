import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { unirMesas, previewMesaAUnir } from "@/lib/sesiones/mesas";

const ROLES_PERMITIDOS = ["MOZO", "ADMIN", "SUPER_ADMIN"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !ROLES_PERMITIDOS.includes(session.rol) || !session.localId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sesionId = Number(id);
  if (isNaN(sesionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const { searchParams } = new URL(_req.url);
  const mesaUnidaId = Number(searchParams.get("mesaId"));
  if (!mesaUnidaId || isNaN(mesaUnidaId)) {
    return NextResponse.json({ error: "Falta mesaId" }, { status: 400 });
  }

  try {
    const preview = await previewMesaAUnir(mesaUnidaId, session.localId);
    return NextResponse.json(preview);
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : "Error al obtener preview";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}

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
    await unirMesas({
      sesionPrincipalId,
      mesaUnidaId,
      localId: session.localId,
      ejecutadoPor: session.userId,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : "Error al unir mesas";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
