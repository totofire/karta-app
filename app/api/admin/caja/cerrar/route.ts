import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.localId || session.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { localId } = session;

  const turno = await prisma.turno.findFirst({
    where: { localId, fechaCierre: null },
    include: { retiros: true },
  });

  if (!turno) {
    return NextResponse.json({ error: "No hay turno abierto" }, { status: 404 });
  }

  const body = await request.json();
  const efectivoFinal = Number(body.efectivoFinal ?? 0);

  if (isNaN(efectivoFinal) || efectivoFinal < 0) {
    return NextResponse.json({ error: "Efectivo final inválido" }, { status: 400 });
  }

  const fechaCierre = new Date();

  // Calcular ingresos por método desde sesiones del turno
  const sesiones = await prisma.sesion.findMany({
    where: {
      localId,
      fechaFin: { gte: turno.fechaApertura, lte: fechaCierre },
    },
    select: { totalVenta: true, metodoPago: true, descuentoTotal: true },
  });

  let ingresoEfectivo = 0, ingresoTarjeta = 0, ingresoQr = 0;
  for (const s of sesiones) {
    const neto = s.totalVenta - s.descuentoTotal;
    if (s.metodoPago === "EFECTIVO") ingresoEfectivo += neto;
    else if (s.metodoPago === "TARJETA") ingresoTarjeta += neto;
    else if (s.metodoPago === "QR") ingresoQr += neto;
  }

  const totalRetiros = turno.retiros.reduce((acc, r) => acc + r.monto, 0);
  const efectivoEsperado = turno.efectivoInicial + ingresoEfectivo - totalRetiros;
  const diferencia = efectivoFinal - efectivoEsperado;

  const turnoCerrado = await prisma.turno.update({
    where: { id: turno.id },
    data: { fechaCierre, efectivoFinal },
    include: { retiros: true },
  });

  return NextResponse.json({
    turno: turnoCerrado,
    resumen: {
      efectivo: ingresoEfectivo,
      tarjeta: ingresoTarjeta,
      qr: ingresoQr,
      total: ingresoEfectivo + ingresoTarjeta + ingresoQr,
      sesiones: sesiones.length,
      totalRetiros,
      efectivoEsperado,
      diferencia,
    },
  });
}
