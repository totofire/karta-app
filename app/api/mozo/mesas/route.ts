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
        // Mapa para agrupar ítems iguales
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
        tokenEfimero: sesion?.tokenEfimero ?? null, // 👈 agregar esto
        detalles,
      };
    });

    return NextResponse.json(mesasConEstado);
  } catch (error) {
    return NextResponse.json(
      { error: "Error cargando mesas" },
      { status: 500 },
    );
  }
}
