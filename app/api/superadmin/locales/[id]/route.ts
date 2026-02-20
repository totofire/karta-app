import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/superadmin/locales/[id]
// Actualiza estado, plan, montoPlan, trialHasta, fechaVence o notasAdmin
// Body (todos opcionales): { estado, plan, montoPlan, trialDias, notasAdmin }
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const localId = Number(params.id);
  if (isNaN(localId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const local = await prisma.local.findUnique({ where: { id: localId } });
  if (!local) return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const { estado, plan, montoPlan, trialDias, fechaVence, notasAdmin } = body;

    const data: Record<string, unknown> = {};

    if (estado    !== undefined) data.estado    = estado;
    if (plan      !== undefined) data.plan      = plan;
    if (notasAdmin !== undefined) data.notasAdmin = notasAdmin;

    if (montoPlan !== undefined) data.montoPlan = Number(montoPlan);

    // Si se pasa trialDias, recalculamos trialHasta desde hoy
    if (trialDias !== undefined) {
      const nueva = new Date();
      nueva.setDate(nueva.getDate() + Number(trialDias));
      data.trialHasta = nueva;
    }

    if (fechaVence !== undefined) {
      data.fechaVence = fechaVence ? new Date(fechaVence) : null;
    }

    // Si se activa un local que estaba SUSPENDIDO, reactivamos también su usuario admin
    if (estado === "ACTIVO" && local.estado === "SUSPENDIDO") {
      await prisma.usuario.updateMany({
        where: { localId, rol: "ADMIN" },
        data:  { activo: true },
      });
    }

    // Si se suspende o da de baja, desactivamos al usuario admin
    if (estado === "SUSPENDIDO" || estado === "BAJA") {
      await prisma.usuario.updateMany({
        where: { localId, rol: "ADMIN" },
        data:  { activo: false },
      });
    }

    const updated = await prisma.local.update({
      where: { id: localId },
      data,
    });

    return NextResponse.json({ success: true, local: updated });

  } catch (error) {
    console.error("Error actualizando local:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/superadmin/locales/[id]
// Soft delete: pone estado BAJA y desactiva todos los usuarios del local
// No borra datos — los datos quedan guardados
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const localId = Number(params.id);
  if (isNaN(localId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const local = await prisma.local.findUnique({ where: { id: localId } });
  if (!local) return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });

  try {
    await prisma.$transaction([
      // Desactivar todos los usuarios del local
      prisma.usuario.updateMany({
        where: { localId },
        data:  { activo: false },
      }),
      // Marcar el local como BAJA
      prisma.local.update({
        where: { id: localId },
        data:  { estado: "BAJA" },
      }),
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error dando de baja local:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}