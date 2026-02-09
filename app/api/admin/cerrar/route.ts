import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { sesionId } = await req.json();

    if (!sesionId) return NextResponse.json({ error: "Falta ID de sesión" }, { status: 400 });

    // 🔥 INICIAMOS TRANSACCIÓN (Todo o nada)
    const resultado = await prisma.$transaction(async (tx) => {

      // 1. Buscar la sesión y sus pedidos para calcular el total REAL
      // Validamos que sea de nuestro local (localId)
      const sesion = await tx.sesion.findFirst({
        where: { 
          id: sesionId,
          localId: localId 
        },
        include: { 
          pedidos: { 
            include: { items: true } 
          } 
        }
      });

      if (!sesion) throw new Error("Sesión no encontrada o no pertenece al local");

      // 2. Calcular el total (Ignorando cancelados)
      let totalFinal = 0;
      
      sesion.pedidos.forEach((pedido) => {
        // Solo sumamos si el pedido NO está cancelado
        if (pedido.estado !== "CANCELADO") {
          pedido.items.forEach((item) => {
             // Opcional: Si tus items individuales pueden cancelarse, agrega check aquí
             // if (item.estado !== "CANCELADO") ...
             totalFinal += item.precio * item.cantidad;
          });
        }
      });

      // 3. LIMPIEZA DE "ZOMBIS" (Cocina/Barra)
      // Pasamos a ENTREGADO todo lo que haya quedado colgado (PENDIENTE/PREPARACION)
      // para que desaparezca de las pantallas KDS.
      
      // Actualizar Pedidos
      await tx.pedido.updateMany({
        where: { 
          sesionId: sesionId,
          estado: { not: "CANCELADO" } // No revivimos lo cancelado
        },
        data: { estado: "ENTREGADO" }
      });

      // Actualizar Items individuales
      await tx.itemPedido.updateMany({
        where: { 
          pedido: { sesionId: sesionId },
          estado: { not: "CANCELADO" }
        },
        data: { estado: "ENTREGADO" }
      });

      // 4. CERRAR LA SESIÓN DEFINITIVAMENTE
      const sesionCerrada = await tx.sesion.update({
        where: { id: sesionId },
        data: {
          fechaFin: new Date(),        // Marca de tiempo final
          totalVenta: totalFinal,      // Guardamos cuánto se facturó
          solicitaCuenta: null,        // Apagamos la alerta de "Pide Cuenta"
        }
      });
      
      // Liberamos la mesa asociada para que pueda usarse de nuevo
      // (Aunque la lógica principal es por sesión, esto ayuda si usas flags en Mesa)
      await tx.mesa.update({
        where: { id: sesion.mesaId },
        data: { activo: true } 
      });

      return { total: totalFinal, fecha: sesionCerrada.fechaFin };
    });

    return NextResponse.json({ 
      success: true, 
      recaudado: resultado.total,
      fechaCierre: resultado.fecha
    });

  } catch (error: any) {
    console.error("❌ Error cerrando mesa:", error.message);
    
    // Manejo de errores específico
    if (error.message === "Sesión no encontrada o no pertenece al local") {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "Error interno al cerrar mesa" }, { status: 500 });
  }
}