import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MenuInterface from "@/app/mesa/[token]/MenuInterface";
import ClienteListener from "@/components/ClienteListener";
import { Store, ScanLine } from "lucide-react"; 

// 👇 1. IMPORTA EL PROVIDER
import { LoaderProvider } from "@/context/LoaderContext"; 

// Forzamos dinamismo para evitar caché y tener datos frescos siempre
export const dynamic = 'force-dynamic';

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ tk?: string }>;
}) {
  const params = await searchParams;
  const { tk: tokenEfimero } = params;

  if (!tokenEfimero) return notFound();

  // 1. Validar la sesión y traer pedidos NO cancelados
  const sesion = await prisma.sesion.findUnique({
    where: { tokenEfimero },
    include: { 
      mesa: true,
      pedidos: {
        where: { estado: { not: "CANCELADO" } }, 
        include: {
          items: {
            include: {
              producto: true 
            }
          }
        },
        orderBy: { fecha: 'desc' }
      }
    },
  });

  // 2. Validaciones de seguridad (Enlace Caducado)
  if (!sesion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-sm text-center border border-gray-200 flex flex-col items-center relative overflow-hidden">
          
          {/* Decoración superior con tus colores */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#A62E2E] to-[#8C2626]"></div>

          {/* Icono con fondo sutil usando tu color */}
          <div className="w-20 h-20 bg-[#A62E2E]/10 rounded-full flex items-center justify-center mb-6 border border-[#A62E2E]/20">
            <ScanLine size={40} className="text-[#A62E2E]" />
          </div>
          
          <h2 className="text-2xl font-black text-gray-900 mb-2">Enlace Caducado</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Por seguridad, este QR ya no es válido. <br/>
            <span className="text-[#A62E2E] font-bold">Por favor, escaneá la mesa nuevamente.</span>
          </p>
        </div>
      </div>
    );
  }

  // 3. Validación de Mesa Cerrada (Cuenta Cobrada)
  if (sesion.fechaFin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-sm text-center border border-slate-800 flex flex-col items-center relative overflow-hidden">
          
          {/* Decoración de fondo */}
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

  // 3. Cargar el menú (Categorías y Productos)
  const categorias = await prisma.categoria.findMany({
    include: {
      productos: {
        where: { activo: true },
        orderBy: { orden: 'asc' }
      }
    },
    orderBy: { orden: 'asc' }
  });

  // 4. Renderizar: Listener + Interfaz
  // 👇 2. ENVUELVE TODO DENTRO DEL PROVIDER
  return (
    <LoaderProvider>
      <ClienteListener sesionId={sesion.id} />

      <MenuInterface 
        mesa={sesion.mesa} 
        categorias={categorias} 
        tokenEfimero={tokenEfimero}
        pedidosHistoricos={sesion.pedidos} 
      />
    </LoaderProvider>
  );
}