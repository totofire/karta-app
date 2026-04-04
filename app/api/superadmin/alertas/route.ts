import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface Alerta {
  tipo: "TRIAL_POR_VENCER" | "PAGO_VENCIDO" | "INACTIVO" | "INVITE_VENCIDO";
  severidad: "alta" | "media";
  localId: number;
  localNombre: string;
  detalle: string;
}

export async function GET() {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const ahora   = new Date();
    const en7dias  = new Date(ahora); en7dias.setDate(ahora.getDate() + 7);
    const hace7dias = new Date(ahora); hace7dias.setDate(ahora.getDate() - 7);

    const [trialPorVencer, pagoVencido, localesActivos, invitesVencidos] = await Promise.all([
      prisma.local.findMany({
        where: { estado: "DEMO", trialHasta: { gte: ahora, lte: en7dias } },
        select: { id: true, nombre: true, trialHasta: true },
      }),
      prisma.local.findMany({
        where: { estado: "ACTIVO", fechaVence: { lt: ahora } },
        select: { id: true, nombre: true, fechaVence: true },
      }),
      prisma.local.findMany({
        where: { estado: "ACTIVO" },
        select: { id: true, nombre: true },
      }),
      prisma.usuario.findMany({
        where: { rol: "ADMIN", activo: false, inviteExpira: { lt: ahora }, localId: { not: null } },
        select: {
          nombre: true,
          inviteExpira: true,
          local: { select: { id: true, nombre: true } },
        },
      }),
    ]);

    // Locales activos sin actividad en 7 días
    const sesionesRecientes = await prisma.sesion.groupBy({
      by: ["localId"],
      where: {
        fechaFin: { gte: hace7dias, not: null },
        localId:  { in: localesActivos.map((l) => l.id) },
      },
      _count: { id: true },
    });
    const conActividad = new Set(sesionesRecientes.map((s) => s.localId));
    const inactivos    = localesActivos.filter((l) => !conActividad.has(l.id));

    const alertas: Alerta[] = [];

    for (const l of pagoVencido) {
      const dias = Math.ceil((ahora.getTime() - new Date(l.fechaVence!).getTime()) / 86_400_000);
      alertas.push({
        tipo:        "PAGO_VENCIDO",
        severidad:   "alta",
        localId:     l.id,
        localNombre: l.nombre,
        detalle:     `Pago vencido hace ${dias} día${dias !== 1 ? "s" : ""}`,
      });
    }

    for (const l of trialPorVencer) {
      const dias = Math.ceil((new Date(l.trialHasta!).getTime() - ahora.getTime()) / 86_400_000);
      alertas.push({
        tipo:        "TRIAL_POR_VENCER",
        severidad:   dias <= 2 ? "alta" : "media",
        localId:     l.id,
        localNombre: l.nombre,
        detalle:     `Trial vence en ${dias} día${dias !== 1 ? "s" : ""}`,
      });
    }

    for (const l of inactivos) {
      alertas.push({
        tipo:        "INACTIVO",
        severidad:   "media",
        localId:     l.id,
        localNombre: l.nombre,
        detalle:     "Sin actividad en los últimos 7 días",
      });
    }

    for (const u of invitesVencidos) {
      if (!u.local) continue;
      alertas.push({
        tipo:        "INVITE_VENCIDO",
        severidad:   "media",
        localId:     u.local.id,
        localNombre: u.local.nombre,
        detalle:     `Invite de ${u.nombre} venció sin activar`,
      });
    }

    alertas.sort((a, b) => (a.severidad === "alta" ? -1 : 1) - (b.severidad === "alta" ? -1 : 1));

    return NextResponse.json({ alertas });
  } catch (error) {
    console.error("Error obteniendo alertas:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
