import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import MenuInterface from "./MenuInterface";

const prisma = new PrismaClient();

// Definimos que params es una Promesa (requisito de Next.js 15/16)
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  
  // 1. DESEMPAQUETAMOS EL TOKEN (Esperamos la promesa)
  const { token } = await params;

  // 2. BUSCAMOS LA MESA
  const mesa = await prisma.mesa.findUnique({
    where: { qr_token: token },
  });

  // Si el token está mal o la mesa no existe, mandamos error 404
  if (!mesa) {
    return notFound();
  }

  // 3. TRAEMOS LA CARTA (Categorías + Productos Activos)
  const categorias = await prisma.categoria.findMany({
    include: {
      productos: {
        where: { activo: true }, // Solo traemos productos con stock
        orderBy: { orden: 'asc' } // Ordenados como configuraste
      }
    },
    orderBy: { orden: 'asc' } // Las categorías también ordenadas (1. Cervezas, 2. Hamburguesas...)
  });

  // 4. PASAMOS TODO A LA PANTALLA VISUAL
  return <MenuInterface mesa={mesa} categorias={categorias} />;
}