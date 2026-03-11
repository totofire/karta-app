import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";
import { randomBytes } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/locales
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
      _count: { select: { mesas: { where: { activo: true } } } },
    },
  });

  const metricas = await prisma.sesion.groupBy({
    by: ["localId"],
    where: { fechaFin: { gte: inicioMes } },
    _sum:   { totalVenta: true },
    _count: { id: true },
    _avg:   { totalVenta: true },
  });

  const metricaMap = new Map(metricas.map((m) => [m.localId, m]));

  const data = locales.map((local) => {
    const m = metricaMap.get(local.id);
    return {
      id:         local.id,
      nombre:     local.nombre,
      slug:       local.slug,
      estado:     local.estado,
      plan:       local.plan,
      montoPlan:  local.montoPlan,
      trialHasta: local.trialHasta,
      fechaVence: local.fechaVence,
      fechaAlta:  local.fechaAlta,
      notasAdmin: local.notasAdmin,
      admin:      local.usuarios[0] ?? null,
      mesas:      local._count.mesas,
      mes: {
        ventaTotal:     m?._sum.totalVenta ?? 0,
        sesiones:       m?._count.id       ?? 0,
        ticketPromedio: m?._avg.totalVenta ? Math.round(m._avg.totalVenta) : 0,
      },
    };
  });

  return NextResponse.json({ locales: data });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/locales
// Crea local ACTIVO + admin pendiente. Devuelve inviteUrl para WhatsApp.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { nombreLocal, direccion, nombreAdmin, emailAdmin } = await req.json();

    if (!nombreLocal?.trim() || !nombreAdmin?.trim() || !emailAdmin?.trim()) {
      return NextResponse.json(
        { error: "nombreLocal, nombreAdmin y emailAdmin son obligatorios" },
        { status: 400 }
      );
    }

    const existe = await prisma.usuario.findUnique({
      where: { email: emailAdmin.trim().toLowerCase() },
    });
    if (existe) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }

    // ── Slug con dedup ──────────────────────────────────────────────
    let slug = nombreLocal
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const slugExiste = await prisma.local.findUnique({ where: { slug } });
    if (slugExiste) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    // ── Invite token (48hs) ─────────────────────────────────────────
    const inviteToken  = randomBytes(32).toString("hex");
    const inviteExpira = new Date();
    inviteExpira.setHours(inviteExpira.getHours() + 48);

    // ── Transacción: local + config + admin ─────────────────────────
    const { local, usuario } = await prisma.$transaction(async (tx) => {
      const local = await tx.local.create({
        data: {
          nombre:    nombreLocal.trim(),
          direccion: direccion?.trim() || null,
          slug,
          estado:    "ACTIVO",
          plan:      "BASIC",
        },
      });

      await tx.configuracion.create({ data: { localId: local.id } });

      const usuario = await tx.usuario.create({
        data: {
          nombre:       nombreAdmin.trim(),
          email:        emailAdmin.trim().toLowerCase(),
          password:     null,
          rol:          "ADMIN",
          activo:       false,
          localId:      local.id,
          inviteToken,
          inviteExpira,
        },
      });

      return { local, usuario };
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/activar-cuenta?token=${inviteToken}`;

    return NextResponse.json({
      success:   true,
      inviteUrl,
      local:   { id: local.id, nombre: local.nombre, slug: local.slug, estado: local.estado },
      usuario: { id: usuario.id, email: usuario.email },
    });

  } catch (error) {
    console.error("Error creando local:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}