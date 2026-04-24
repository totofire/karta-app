import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/equipo/[id]
// Edita nombre, email, activo y/o resetea contraseña de un mozo
// Body (todos opcionales): { nombre, email, activo, password }
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { localId } = admin;

  try {
    // Verificar que el mozo pertenece a mi local
    const mozo = await prisma.usuario.findFirst({
      where: { id: Number(id), localId, rol: "MOZO" },
    });

    if (!mozo) {
      return NextResponse.json({ error: "Mozo no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.nombre !== undefined) data.nombre = body.nombre.trim();
    if (body.activo !== undefined) data.activo = body.activo;

    // Si cambia el email, verificar que no esté en uso
    if (body.email !== undefined && body.email.trim().toLowerCase() !== mozo.email) {
      const emailEnUso = await prisma.usuario.findUnique({
        where: { email: body.email.trim().toLowerCase() },
      });
      if (emailEnUso) {
        return NextResponse.json(
          { error: "Ese email ya está en uso por otro usuario" },
          { status: 409 }
        );
      }
      data.email = body.email.trim().toLowerCase();
    }

    // Si envían nueva contraseña, la hasheamos
    if (body.password && body.password.length >= 6) {
      data.password = await bcrypt.hash(body.password, 10);
    } else if (body.password && body.password.length > 0 && body.password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const actualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data,
      select: {
        id:        true,
        nombre:    true,
        email:     true,
        activo:    true,
        fechaAlta: true,
      },
    });

    return NextResponse.json(actualizado);

  } catch (error) {
    console.error("Error actualizando mozo:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/equipo/[id]
// Elimina un mozo (delete real — no tiene sesiones propias)
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { localId } = admin;

  try {
    const count = await prisma.usuario.deleteMany({
      where: { id: Number(id), localId, rol: "MOZO" },
    });

    if (count.count === 0) {
      return NextResponse.json({ error: "Mozo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error eliminando mozo:", error);
    return NextResponse.json({ error: "Error al eliminar. Puede tener datos asociados." }, { status: 500 });
  }
}