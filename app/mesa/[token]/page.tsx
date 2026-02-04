import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Este archivo ahora solo sirve para ESCANEAR y REDIRIGIR
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: qrToken } = await params;

  // 1. Buscar la mesa por su QR FÍSICO (el pegado en la mesa)
  const mesa = await prisma.mesa.findUnique({
    where: { qr_token: qrToken },
  });

  if (!mesa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-red-600 font-bold text-xl">Mesa no encontrada 🚫</p>
      </div>
    );
  }

  // 2. Buscar si hay una sesión ACTIVA (abierta y no expirada)
  let sesion = await prisma.sesion.findFirst({
    where: {
      mesaId: mesa.id,
      fechaFin: null,           // 🔥 Que NO esté cerrada
      expiraEn: { gte: new Date() }, // 🔥 Que NO haya expirado
    },
  });

  // 3. Si NO existe sesión válida → CREAMOS UNA NUEVA
  if (!sesion) {
    const tokenEfimero = crypto.randomBytes(32).toString("hex");
    // La sesión dura 4 horas (tiempo razonable para una cena larga)
    const expiraEn = new Date(Date.now() + 4 * 60 * 60 * 1000); 

    sesion = await prisma.sesion.create({
      data: {
        mesaId: mesa.id,
        tokenEfimero,
        expiraEn,
      },
    });
    console.log(`✨ Nueva sesión creada para ${mesa.nombre}`);
  } else {
    console.log(`♻️ Reutilizando sesión activa para ${mesa.nombre}`);
  }

  // 4. Redirigir a la NUEVA página de pedido con el token seguro
  redirect(`/pedido?tk=${sesion.tokenEfimero}`);
}