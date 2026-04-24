import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { localId } = admin;

  const [turnoActivo, turnosCerrados] = await Promise.all([
    prisma.turno.findFirst({
      where: { localId, fechaCierre: null },
      include: { retiros: { orderBy: { fecha: "asc" } } },
    }),
    prisma.turno.findMany({
      where: { localId, fechaCierre: { not: null } },
      include: { retiros: true },
      orderBy: { fechaApertura: "desc" },
      take: 10,
    }),
  ]);

  // Calcular ingresos del turno activo si existe
  let resumenActivo = null;
  if (turnoActivo) {
    resumenActivo = await calcularResumenTurno(localId, turnoActivo.fechaApertura, new Date());
  }

  // Agregar resumen a cada turno cerrado
  const historial = await Promise.all(
    turnosCerrados.map(async (t) => ({
      ...t,
      resumen: await calcularResumenTurno(localId, t.fechaApertura, t.fechaCierre!),
    }))
  );

  return NextResponse.json({
    turnoActivo: turnoActivo ? { ...turnoActivo, resumen: resumenActivo } : null,
    historial,
  });
}

async function calcularResumenTurno(localId: number, desde: Date, hasta: Date) {
  const sesiones = await prisma.sesion.findMany({
    where: {
      localId,
      fechaFin: { gte: desde, lte: hasta },
    },
    select: { totalVenta: true, metodoPago: true, descuentoTotal: true },
  });

  let efectivo = 0, tarjeta = 0, qr = 0;
  for (const s of sesiones) {
    const neto = s.totalVenta - s.descuentoTotal;
    if (s.metodoPago === "EFECTIVO") efectivo += neto;
    else if (s.metodoPago === "TARJETA") tarjeta += neto;
    else if (s.metodoPago === "QR") qr += neto;
  }

  return { efectivo, tarjeta, qr, total: efectivo + tarjeta + qr, sesiones: sesiones.length };
}
