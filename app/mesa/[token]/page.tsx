import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import MenuInterface from "./MenuInterface";

import { prisma } from "@/lib/prisma";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // 🚀 OPTIMIZACIÓN: Ejecutamos las dos consultas en paralelo
  const [mesa, categorias] = await Promise.all([
    // Query 1: Mesa
    prisma.mesa.findUnique({
      where: { qr_token: token },
      include: {
        sesiones: {
          where: { fechaFin: null },
          take: 1,
        },
      },
    }),

    // Query 2: Categorías y Productos
    prisma.categoria.findMany({
      where: {
        productos: { some: { activo: true } }, // Solo traemos categorías que tengan algo para vender
      },
      include: {
        productos: {
          where: { activo: true },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: { orden: "asc" },
    }),
  ]);

  if (!mesa) return notFound();

  // Obtenemos el host si existe
  const nombreHost = mesa.sesiones[0]?.nombreHost || null;

  return (
    <MenuInterface
      mesa={mesa}
      categorias={categorias}
      hostInicial={nombreHost}
    />
  );
}
