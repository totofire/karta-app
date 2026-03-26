import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const localId = await getLocalId();
  if (!localId)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const mesas = await prisma.mesa.findMany({
      where: { localId, activo: true },
      include: {
        sesiones: {
          where: { fechaFin: null },
          include: {
            pedidos: {
              where: { estado: { not: "CANCELADO" } },
              include: {
                items: {
                  where: { estado: { not: "CANCELADO" } }, // 👈 FILTRAR ITEMS CANCELADOS
                  include: { producto: true },
                },
              },
            },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    const mesasConEstado = mesas.map((m) => {
      const sesion = m.sesiones[0];

      let totalActual = 0;
      const detalles: any[] = [];

      if (sesion) {
        const mapa = new Map<number, any>();
        sesion.pedidos.forEach((p) => {
          p.items.forEach((item) => {
            const subtotal = item.precio * item.cantidad;
            totalActual += subtotal;
            const existente = mapa.get(item.productoId);
            if (existente) {
              existente.cantidad += item.cantidad;
              existente.subtotal += subtotal;
            } else {
              mapa.set(item.productoId, {
                producto: item.producto.nombre,
                cantidad: item.cantidad,
                precio: item.precio,
                subtotal,
              });
            }
          });
        });
        detalles.push(...mapa.values());
      }

      return {
        id: m.id,
        nombre: m.nombre,
        sector: m.sector,
        ocupada: m.sesiones.length > 0,
        totalActual,
        horaInicio: sesion?.fechaInicio ?? null,
        sesionId: sesion?.id ?? null,
        solicitaCuenta: sesion?.solicitaCuenta ?? null,
        metodoPago: sesion?.metodoPago ?? null,
        tokenEfimero: sesion?.tokenEfimero ?? null,
        llamadaMozo: sesion?.llamadaMozo ?? null,
        detalles,
      };
    });

    return NextResponse.json({ mesas: mesasConEstado, localId }, {
      headers: {
        // Importante para PWA / Service Workers: evitar cache de estado en vivo
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error cargando mesas" },
      { status: 500 }
    );
  }
}