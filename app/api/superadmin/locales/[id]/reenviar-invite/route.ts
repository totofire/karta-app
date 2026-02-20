import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";
import { randomBytes } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/locales/[id]/reenviar-invite
// Regenera el token y reenvía el mail de invitación al admin del local
// Útil cuando el token expiró o el admin no recibió el mail
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const localId = Number(params.id);
  if (isNaN(localId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  // Buscamos el admin del local que todavía no activó su cuenta
  const usuario = await prisma.usuario.findFirst({
    where: {
      localId,
      rol:    "ADMIN",
      activo: false,
    },
    include: { local: { select: { nombre: true } } },
  });

  if (!usuario) {
    return NextResponse.json(
      { error: "No hay ningún admin pendiente de activación en este local" },
      { status: 404 }
    );
  }

  // Regenerar token con 48hs nuevas
  const inviteToken  = randomBytes(32).toString("hex");
  const inviteExpira = new Date();
  inviteExpira.setHours(inviteExpira.getHours() + 48);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data:  { inviteToken, inviteExpira },
  });

  // ── Enviar mail ────────────────────────────────────────────────────
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/activar-cuenta?token=${inviteToken}`;
  console.log(`✉️  REENVÍO INVITE para ${usuario.email}: ${inviteUrl}`);

  // Cuando tengas Resend configurado, descomentar:
  // await sendInviteEmail({
  //   to:     usuario.email,
  //   nombre: usuario.nombre,
  //   url:    inviteUrl,
  // });

  return NextResponse.json({
    success: true,
    email:   usuario.email,
    ...(process.env.NODE_ENV !== "production" && { inviteUrl }),
  });
}