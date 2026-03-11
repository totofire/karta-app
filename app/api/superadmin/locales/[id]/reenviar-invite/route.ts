import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";
import { randomBytes } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/locales/[id]/reenviar-invite
// Regenera el token y devuelve la URL para mandar por WhatsApp
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const localId = Number(id);
  if (isNaN(localId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const usuario = await prisma.usuario.findFirst({
    where: { localId, rol: "ADMIN", activo: false },
    include: { local: { select: { nombre: true } } },
  });

  if (!usuario) {
    return NextResponse.json(
      { error: "No hay ningún admin pendiente de activación en este local" },
      { status: 404 }
    );
  }

  const inviteToken  = randomBytes(32).toString("hex");
  const inviteExpira = new Date();
  inviteExpira.setHours(inviteExpira.getHours() + 48);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data:  { inviteToken, inviteExpira },
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/activar-cuenta?token=${inviteToken}`;

  return NextResponse.json({
    success:   true,
    email:     usuario.email,
    inviteUrl,
  });
}