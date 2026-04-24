import { prisma } from "@/lib/prisma";
import { EstadoSesion } from "@prisma/client";

export interface UnirMesasParams {
  sesionPrincipalId: number;
  mesaUnidaId: number;
  localId: number;
  ejecutadoPor: number;
}

export interface SepararMesaParams {
  sesionPrincipalId: number;
  mesaUnidaId: number;
  localId: number;
  ejecutadoPor: number;
}

export interface PreviewMesa {
  mesaId: number;
  mesaNombre: string;
  totalPedidos: number;
  montoTotal: number;
  sesionId: number | null;
}

/** Devuelve datos de preview de Mesa B para mostrar en el modal de confirmación. */
export async function previewMesaAUnir(
  mesaUnidaId: number,
  localId: number
): Promise<PreviewMesa> {
  const mesa = await prisma.mesa.findFirst({
    where: { id: mesaUnidaId, localId },
    select: {
      id: true,
      nombre: true,
      sesiones: {
        where: { fechaFin: null, estado: EstadoSesion.ACTIVA },
        take: 1,
        orderBy: { fechaInicio: "desc" },
        select: {
          id: true,
          pedidos: {
            where: { estado: { not: "CANCELADO" } },
            select: {
              items: {
                where: { estado: { not: "CANCELADO" } },
                select: { precio: true, cantidad: true },
              },
            },
          },
        },
      },
    },
  });

  if (!mesa) throw new Error("Mesa no encontrada");

  const sesionActiva = mesa.sesiones[0] ?? null;
  let totalPedidos = 0;
  let montoTotal = 0;

  if (sesionActiva) {
    for (const pedido of sesionActiva.pedidos) {
      if (pedido.items.length > 0) totalPedidos++;
      for (const item of pedido.items) {
        montoTotal += item.precio * item.cantidad;
      }
    }
  }

  return {
    mesaId: mesa.id,
    mesaNombre: mesa.nombre,
    totalPedidos,
    montoTotal,
    sesionId: sesionActiva?.id ?? null,
  };
}

/**
 * Une Mesa B a la sesión principal de Mesa A.
 * Si Mesa B tiene sesión activa, los pedidos se transfieren a la sesión principal
 * y la sesión de Mesa B se cierra con estado MERGED.
 * Todo ocurre dentro de una única transacción.
 */
export async function unirMesas({
  sesionPrincipalId,
  mesaUnidaId,
  localId,
  ejecutadoPor,
}: UnirMesasParams): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Validar sesión principal pertenece al local y está activa
    const sesionPrincipal = await tx.sesion.findFirst({
      where: { id: sesionPrincipalId, localId, fechaFin: null, estado: EstadoSesion.ACTIVA },
      select: { id: true, mesaId: true },
    });
    if (!sesionPrincipal) throw new Error("Sesión principal no encontrada o ya cerrada");

    // Validar mesa unida pertenece al local y NO es la misma que la principal
    const mesaUnida = await tx.mesa.findFirst({
      where: { id: mesaUnidaId, localId },
      select: {
        id: true,
        nombre: true,
        sesionActivaId: true,
        sesiones: {
          where: { fechaFin: null, estado: EstadoSesion.ACTIVA },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!mesaUnida) throw new Error("Mesa a unir no encontrada");
    if (mesaUnida.sesionActivaId !== null) throw new Error("Mesa ya está unida a otra sesión");
    if (mesaUnida.id === sesionPrincipal.mesaId) throw new Error("No se puede unir una mesa consigo misma");

    // Si Mesa B tiene sesión activa, transferir pedidos y cerrar con MERGED
    const sesionBId = mesaUnida.sesiones[0]?.id ?? null;
    if (sesionBId !== null) {
      await tx.pedido.updateMany({
        where: { sesionId: sesionBId, localId },
        data: { sesionId: sesionPrincipalId },
      });
      await tx.sesion.update({
        where: { id: sesionBId },
        data: {
          fechaFin: new Date(),
          estado: EstadoSesion.MERGED,
          solicitaCuenta: null,
        },
      });
    }

    // Marcar Mesa B como subordinada a la sesión principal
    await tx.mesa.update({
      where: { id: mesaUnidaId },
      data: { sesionActivaId: sesionPrincipalId },
    });

    // Registrar en auditoría
    await tx.mergeMesaLog.create({
      data: {
        accion: "UNIR",
        mesaPrincipalId: sesionPrincipal.mesaId,
        mesaUnidaId,
        ejecutadoPor,
        sesionId: sesionPrincipalId,
        localId,
      },
    });
  });
}

/**
 * Separa Mesa B de la sesión principal sin cerrarla.
 * Los pedidos ya tomados quedan en la sesión principal.
 */
export async function separarMesa({
  sesionPrincipalId,
  mesaUnidaId,
  localId,
  ejecutadoPor,
}: SepararMesaParams): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Validar que Mesa B efectivamente apunta a esta sesión
    const mesaUnida = await tx.mesa.findFirst({
      where: { id: mesaUnidaId, localId, sesionActivaId: sesionPrincipalId },
      select: { id: true },
    });
    if (!mesaUnida) throw new Error("La mesa no pertenece a esta sesión o ya fue separada");

    const sesionPrincipal = await tx.sesion.findFirst({
      where: { id: sesionPrincipalId, localId },
      select: { mesaId: true },
    });
    if (!sesionPrincipal) throw new Error("Sesión principal no encontrada");

    // Liberar Mesa B
    await tx.mesa.update({
      where: { id: mesaUnidaId },
      data: { sesionActivaId: null },
    });

    // Registrar en auditoría
    await tx.mergeMesaLog.create({
      data: {
        accion: "SEPARAR",
        mesaPrincipalId: sesionPrincipal.mesaId,
        mesaUnidaId,
        ejecutadoPor,
        sesionId: sesionPrincipalId,
        localId,
      },
    });
  });
}
