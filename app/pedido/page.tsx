import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MenuInterface from "@/app/mesa/[token]/MenuInterface";

// Forzamos dinamismo para evitar caché en los pedidos
export const dynamic = 'force-dynamic';

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ tk?: string }>;
}) {
  const params = await searchParams;
  const { tk: tokenEfimero } = params;

  if (!tokenEfimero) return notFound();

  // 1. Validar la sesión por el TOKEN EFÍMERO y traer HISTORIAL
  const sesion = await prisma.sesion.findUnique({
    where: { tokenEfimero },
    include: { 
      mesa: true,
      // 👇 AGREGADO: Traer pedidos anteriores para "Mi Cuenta"
      pedidos: {
        where: { estado: { not: "CANCELADO" } },
        include: {
          items: {
            include: {
              producto: true // Necesario para mostrar nombres y precios en el resumen
            }
          }
        }
      }
    },
  });

  // 2. Si no existe, error
  if (!sesion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-black text-red-600 mb-2">Link Inválido</h2>
          <p className="text-gray-700">Este enlace ya no sirve. Por favor, escaneá el QR de la mesa nuevamente.</p>
        </div>
      </div>
    );
  }

  // 3. Si la mesa ya se cobró, bloqueamos
  if (sesion.fechaFin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-black text-blue-600 mb-2">Mesa Cerrada</h2>
          <p className="text-gray-700">Esta cuenta ya fue cerrada. Para pedir de nuevo, escaneá el QR.</p>
        </div>
      </div>
    );
  }

  // 4. Cargar productos del menú
  const categorias = await prisma.categoria.findMany({
    include: {
      productos: {
        where: { activo: true },
        orderBy: { orden: 'asc' }
      }
    },
    orderBy: { orden: 'asc' }
  });

  // 5. Renderizamos pasando los pedidos históricos
  return (
    <MenuInterface 
      mesa={sesion.mesa} 
      categorias={categorias} 
      tokenEfimero={tokenEfimero}
      pedidosHistoricos={sesion.pedidos || []} // 👈 Pasamos el historial aquí
    />
  );
}