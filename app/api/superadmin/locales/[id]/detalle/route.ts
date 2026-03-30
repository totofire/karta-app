import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const localId = Number(id);
  if (isNaN(localId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const local = await prisma.local.findUnique({
    where: { id: localId },
    include: {
      usuarios: {
        where: { rol: "ADMIN" },
        select: { id: true, nombre: true, email: true, activo: true, inviteExpira: true, fechaAlta: true },
        take: 1,
      },
      configuracion: {
        select: { horaApertura: true, horaCierre: true, usaStock: true, alertaKdsMinutos: true },
      },
      _count: {
        select: {
          mesas:      { where: { activo: true } },
          categorias: true,
          productos:  { where: { activo: true } },
          usuarios:   { where: { rol: "MOZO", activo: true } },
        },
      },
    },
  });

  if (!local) return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });

  const ahora  = new Date();
  const hace7  = new Date(ahora); hace7.setDate(ahora.getDate() - 7);
  const hace30 = new Date(ahora); hace30.setDate(ahora.getDate() - 30);
  const hace56 = new Date(ahora); hace56.setDate(ahora.getDate() - 56);

  const [met7, met30] = await Promise.all([
    prisma.sesion.aggregate({
      where: { localId, fechaFin: { gte: hace7, not: null } },
      _count: { id: true },
      _sum:   { totalVenta: true },
    }),
    prisma.sesion.aggregate({
      where: { localId, fechaFin: { gte: hace30, not: null } },
      _count: { id: true },
      _sum:   { totalVenta: true },
      _avg:   { totalVenta: true },
    }),
  ]);

  type SemanaRow = { semana: string; ventas: number; sesiones: bigint };
  const rawSemanas = await prisma.$queryRaw<SemanaRow[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('week', "fechaFin"), 'YYYY-"W"IW') AS semana,
      COALESCE(SUM("totalVenta"), 0)::float                  AS ventas,
      COUNT(*)                                               AS sesiones
    FROM "sesion"
    WHERE "localId" = ${localId}
      AND "fechaFin" >= ${hace56}
      AND "fechaFin" IS NOT NULL
    GROUP BY DATE_TRUNC('week', "fechaFin")
    ORDER BY DATE_TRUNC('week', "fechaFin") ASC
  `;

  const porSemana = rawSemanas.map((r) => ({
    semana:   r.semana,
    ventas:   Number(r.ventas),
    sesiones: Number(r.sesiones),
  }));

  const admin = local.usuarios[0] ?? null;

  return NextResponse.json({
    id:            local.id,
    nombre:        local.nombre,
    slug:          local.slug,
    direccion:     local.direccion,
    estado:        local.estado,
    plan:          local.plan,
    montoPlan:     local.montoPlan,
    trialHasta:    local.trialHasta,
    fechaVence:    local.fechaVence,
    fechaAlta:     local.fechaAlta,
    notasAdmin:    local.notasAdmin,
    mpEmail:       local.mpEmail,
    mpConectadoEn: local.mpConectadoEn,
    admin: admin ? {
      id:           admin.id,
      nombre:       admin.nombre,
      email:        admin.email,
      activo:       admin.activo,
      inviteExpira: admin.inviteExpira,
      fechaAlta:    admin.fechaAlta,
    } : null,
    config: local.configuracion ?? null,
    counts: {
      mesas:      local._count.mesas,
      categorias: local._count.categorias,
      productos:  local._count.productos,
      mozos:      local._count.usuarios,
    },
    metricas: {
      ultimos7: {
        sesiones: met7._count.id,
        ventas:   met7._sum.totalVenta ?? 0,
      },
      ultimos30: {
        sesiones:       met30._count.id,
        ventas:         met30._sum.totalVenta ?? 0,
        ticketPromedio: met30._avg.totalVenta ? Math.round(met30._avg.totalVenta) : 0,
      },
      porSemana,
    },
  });
}
