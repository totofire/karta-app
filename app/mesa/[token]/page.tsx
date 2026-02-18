import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import MenuInterface from "./MenuInterface";
import ClienteListener from "@/components/ClienteListener";
import { Store, ScanLine } from "lucide-react"; 

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cookieStore = await cookies();
  const userToken = cookieStore.get("token")?.value;
  
  let esMozo = false;
  if (userToken) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
      const { payload } = await jwtVerify(userToken, secret);
      esMozo = payload.rol === "MOZO" || payload.rol === "ADMIN";
    } catch (e) {
      esMozo = false;
    }
  }

  const sesionActiva = await prisma.sesion.findUnique({
    where: { tokenEfimero: token },
    include: { 
      mesa: true,
      local: true 
    }
  });

  const sesionValida = sesionActiva && !sesionActiva.fechaFin; 

  if (sesionActiva && sesionActiva.fechaFin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-sm text-center border border-slate-800 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-[#A62E2E] to-[#8C2626]"></div>
          <div className="w-24 h-24 bg-[#A62E2E]/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-[#A62E2E]/20">
            <Store size={48} className="text-[#A62E2E]" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">¡Muchas Gracias!</h2>
          <p className="text-slate-500 font-medium leading-relaxed mb-6">
            Tu cuenta ya fue cobrada. <br/>Esperamos que hayas disfrutado tu visita.
          </p>
          <div className="text-xs text-[#A62E2E] font-black uppercase tracking-widest border-t border-gray-100 pt-4 w-full">
            KARTA APP
          </div>
        </div>
      </div>
    );
  }

  if (sesionValida) {
    const categorias = await prisma.categoria.findMany({
      where: { localId: sesionActiva.localId },
      include: { 
        productos: { 
          where: { activo: true },
          orderBy: { orden: 'asc' }
        } 
      },
      orderBy: { orden: 'asc' }
    });

    const pedidos = await prisma.pedido.findMany({
      where: { sesionId: sesionActiva.id },
      include: { items: { include: { producto: true } } },
      orderBy: { fecha: 'desc' }
    });

    return (
      <>
        <ClienteListener sesionId={sesionActiva.id} />
        <MenuInterface 
          mesa={sesionActiva.mesa} 
          categorias={categorias} 
          tokenEfimero={sesionActiva.tokenEfimero}
          pedidosHistoricos={pedidos}
          esMozo={esMozo}
        />
      </>
    );
  }

  const mesa = await prisma.mesa.findUnique({
    where: { qr_token: token },
  });

  if (!mesa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-sm text-center border border-gray-200 flex flex-col items-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <ScanLine size={40} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Código Inválido</h2>
          <p className="text-gray-500 font-medium">El código escaneado no existe o ha caducado.</p>
        </div>
      </div>
    );
  }

  let sesionMesa = await prisma.sesion.findFirst({
    where: { mesaId: mesa.id, fechaFin: null },
    orderBy: { fechaInicio: 'desc' }
  });

  if (!sesionMesa) {
    const tokenNuevo = crypto.randomBytes(32).toString("hex");
    const expiraEn = new Date(Date.now() + 4 * 60 * 60 * 1000); 
    
    sesionMesa = await prisma.sesion.create({
      data: {
        mesaId: mesa.id,
        localId: mesa.localId,
        tokenEfimero: tokenNuevo,
        fechaInicio: new Date(),
        expiraEn: expiraEn,
        nombreHost: "Cliente QR"
      },
    });
  }

  redirect(`/mesa/${sesionMesa.tokenEfimero}`);
}