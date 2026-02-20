import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";
import { randomBytes } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/locales
// Lista todos los locales con sus métricas del mes actual
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const locales = await prisma.local.findMany({
    orderBy: { fechaAlta: "desc" },
    include: {
      usuarios: {
        where: { rol: "ADMIN" },
        select: { nombre: true, email: true, activo: true },
        take: 1,
      },
      _count: {
        select: { mesas: true },
      },
    },
  });

  // Métricas del mes para todos los locales en una sola query
  const metricas = await prisma.sesion.groupBy({
    by: ["localId"],
    where: {
      fechaFin: { gte: inicioMes },
    },
    _sum:   { totalVenta: true },
    _count: { id: true },
    _avg:   { totalVenta: true },
  });

  const metricaMap = new Map(metricas.map((m) => [m.localId, m]));

  const data = locales.map((local) => {
    const m = metricaMap.get(local.id);
    return {
      id:           local.id,
      nombre:       local.nombre,
      slug:         local.slug,
      estado:       local.estado,
      plan:         local.plan,
      montoPlan:    local.montoPlan,
      trialHasta:   local.trialHasta,
      fechaVence:   local.fechaVence,
      fechaAlta:    local.fechaAlta,
      notasAdmin:   local.notasAdmin,
      admin: local.usuarios[0] ?? null,
      mesas: local._count.mesas,
      // Métricas del mes
      mes: {
        ventaTotal:     m?._sum.totalVenta  ?? 0,
        sesiones:       m?._count.id        ?? 0,
        ticketPromedio: m?._avg.totalVenta  ? Math.round(m._avg.totalVenta) : 0,
      },
    };
  });

  return NextResponse.json({ locales: data });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/locales
// Crea un local + su usuario admin + manda el mail de invitación
// Body: { nombreLocal, direccion, nombreAdmin, emailAdmin, plan?, trialDias? }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const {
      nombreLocal,
      direccion,
      nombreAdmin,
      emailAdmin,
      plan      = "DEMO",
      trialDias = 14,
    } = await req.json();

    if (!nombreLocal || !nombreAdmin || !emailAdmin) {
      return NextResponse.json(
        { error: "nombreLocal, nombreAdmin y emailAdmin son obligatorios" },
        { status: 400 }
      );
    }

    // Verificar que el email no existe ya
    const existe = await prisma.usuario.findUnique({ where: { email: emailAdmin } });
    if (existe) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }

    // Calcular fecha de vencimiento del trial
    const trialHasta = new Date();
    trialHasta.setDate(trialHasta.getDate() + trialDias);

    // Generar slug a partir del nombre del local
    const slug = nombreLocal
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Generar token de invitación (expira en 48hs)
    const inviteToken  = randomBytes(32).toString("hex");
    const inviteExpira = new Date();
    inviteExpira.setHours(inviteExpira.getHours() + 48);

    // Crear local + usuario en una sola transacción
    const { local, usuario } = await prisma.$transaction(async (tx) => {
      const local = await tx.local.create({
        data: {
          nombre:    nombreLocal,
          direccion: direccion || null,
          slug:      slug,
          estado:    "DEMO",
          plan:      plan as any,
          trialHasta,
        },
      });

      // Crear configuración por defecto
      await tx.configuracion.create({
        data: { localId: local.id },
      });

      const usuario = await tx.usuario.create({
        data: {
          nombre:       nombreAdmin,
          email:        emailAdmin,
          password:     null,       // Sin contraseña hasta que active la cuenta
          rol:          "ADMIN",
          activo:       false,      // Inactivo hasta que active
          localId:      local.id,
          inviteToken,
          inviteExpira,
        },
      });

      return { local, usuario };
    });

    // ── Enviar mail de invitación ───────────────────────────────────
    // TODO: reemplazar con tu servicio de email (Resend, etc.)
    // Por ahora logueamos el link para pruebas
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/activar-cuenta?token=${inviteToken}`;
    console.log(`✉️  INVITE LINK para ${emailAdmin}: ${inviteUrl}`);

    // Cuando tengas Resend configurado, descomentar:
    // await sendInviteEmail({ to: emailAdmin, nombre: nombreAdmin, url: inviteUrl });

    return NextResponse.json({
      success: true,
      local: {
        id:        local.id,
        nombre:    local.nombre,
        slug:      local.slug,
        trialHasta: local.trialHasta,
      },
      usuario: {
        id:    usuario.id,
        email: usuario.email,
      },
      // Solo devuelto para testing — en producción no exponer el token
      ...(process.env.NODE_ENV !== "production" && { inviteUrl }),
    });

  } catch (error) {
    console.error("Error creando local:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}