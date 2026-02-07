import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Forzamos que esta página sea dinámica para que siempre evalúe la sesión al entrar
export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  // En Next.js 15+, params es una promesa que debe esperarse
  const { token: qrToken } = await params;

  // 1. Buscar la mesa por su QR FÍSICO (el que está pegado en la mesa)
  const mesa = await prisma.mesa.findUnique({
    where: { qr_token: qrToken },
  });

  // Si el QR no existe o la mesa fue borrada
  if (!mesa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-2">Código QR Inválido</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              No pudimos identificar esta mesa. <br/>Por favor, avisá al personal.
            </p>
        </div>
      </div>
    );
  }

  // 2. Buscar si hay una sesión ACTIVA (abierta y no expirada)
  let sesion = await prisma.sesion.findFirst({
    where: {
      mesaId: mesa.id,
      fechaFin: null,                // 🔥 Que NO esté cerrada (cobrada y liberada)
      expiraEn: { gte: new Date() }, // 🔥 Que NO haya expirado por tiempo
    },
  });

  // 3. Si NO existe sesión válida → CREAMOS UNA NUEVA
  if (!sesion) {
    const tokenEfimero = crypto.randomBytes(32).toString("hex");
    // La sesión dura 4 horas (tiempo razonable para una cena larga)
    const expiraEn = new Date(Date.now() + 4 * 60 * 60 * 1000); 

    try {
        sesion = await prisma.sesion.create({
          data: {
            mesaId: mesa.id,
            tokenEfimero,
            expiraEn,
            localId: mesa.localId // <--- 🔥 CORRECCIÓN: Agregamos el localId obligatorio
          },
        });
    } catch (error) {
        console.error("Error creando sesión:", error);
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="text-gray-500">Error iniciando sesión. Intenta escanear nuevamente.</p>
            </div>
        );
    }
  }

  redirect(`/pedido?tk=${sesion.tokenEfimero}`);
}