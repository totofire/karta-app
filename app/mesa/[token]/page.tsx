import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import MenuInterface from "./MenuInterface";

// Forzamos dinamismo para evitar caché en validaciones de sesión
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  // En Next.js 15+, params es una promesa
  const { token } = await params;
  const cookieStore = await cookies();
  const userToken = cookieStore.get("token")?.value;
  
  // =================================================================================
  // VERIFICACIÓN DE ROL: ¿Es un Mozo/Admin logueado?
  // =================================================================================
  let esMozo = false;
  
  if (userToken) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
      const { payload } = await jwtVerify(userToken, secret);
      esMozo = payload.rol === "MOZO" || payload.rol === "ADMIN";
    } catch (e) {
      console.log("⚠️ Token inválido o expirado");
      esMozo = false;
    }
  }

  // =================================================================================
  // ESTRATEGIA 1: EL TOKEN ES UNA SESIÓN ACTIVA (Hash largo)
  // Caso: El Mozo hace clic en el dashboard o el Cliente refresca la página.
  // =================================================================================
  
  const sesionActiva = await prisma.sesion.findUnique({
    where: { 
      tokenEfimero: token,
    },
    include: {
      mesa: true,
      local: true
    }
  });

  // Validamos: Existe sesión + No tiene fecha de fin (está abierta) + No expiró
  const sesionValida = sesionActiva && !sesionActiva.fechaFin; 
  // (Opcional: && sesionActiva.expiraEn > new Date())

  if (sesionValida) {
    // ✅ ÉXITO: CARGAMOS EL MENÚ (Server Side Rendering)
    console.log(`✅ Ingreso a Sesión Activa: ${sesionActiva.id} (Mesa: ${sesionActiva.mesa.nombre})`);

    // 1. Cargar el Menú del Local
    const categorias = await prisma.categoria.findMany({
      where: { 
        localId: sesionActiva.localId,
      },
      include: { 
        productos: { 
            where: { activo: true },
            orderBy: { orden: 'asc' }
        } 
      },
      orderBy: { orden: 'asc' }
    });

    // 2. Cargar el Historial de Pedidos de ESTA sesión
    const pedidos = await prisma.pedido.findMany({
        where: { sesionId: sesionActiva.id },
        include: { items: { include: { producto: true } } },
        orderBy: { fecha: 'desc' }
    });

    // 3. Renderizar la Interfaz
    return (
      <MenuInterface 
         mesa={sesionActiva.mesa} 
         categorias={categorias} 
         tokenEfimero={sesionActiva.tokenEfimero}
         pedidosHistoricos={pedidos}
         esMozo={esMozo} // 🔥 PASAMOS LA PROP
      />
    );
  }

  // =================================================================================
  // ESTRATEGIA 2: EL TOKEN ES UN QR FÍSICO DE MESA (Hash corto/fijo)
  // Caso: El Cliente acaba de escanear el sticker en la mesa.
  // =================================================================================

  const mesa = await prisma.mesa.findUnique({
    where: { qr_token: token },
  });

  // ❌ ERROR: El código no es ni sesión ni mesa válida
  if (!mesa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-2">Código Inválido</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              No pudimos identificar este código. <br/>
              Si escaneaste un QR, avisá al mozo.
            </p>
        </div>
      </div>
    );
  }

  // ✅ ES UNA MESA VÁLIDA: Gestión de Sesión
  
  // 1. Buscamos si YA tiene una sesión abierta para reutilizarla
  let sesionMesa = await prisma.sesion.findFirst({
    where: {
      mesaId: mesa.id,
      fechaFin: null, // Solo abiertas
    },
    orderBy: { fechaInicio: 'desc' }
  });

  // 2. Si no hay sesión, CREAMOS UNA NUEVA
  if (!sesionMesa) {
    console.log(`🆕 Creando nueva sesión para Mesa: ${mesa.nombre}`);
    
    const tokenNuevo = crypto.randomBytes(32).toString("hex"); // Token largo seguro
    
    // Opcional: Tiempo de expiración (ej: 4 horas)
    const expiraEn = new Date(Date.now() + 4 * 60 * 60 * 1000); 

    sesionMesa = await prisma.sesion.create({
      data: {
        mesaId: mesa.id,
        localId: mesa.localId,
        tokenEfimero: tokenNuevo,
        fechaInicio: new Date(),
        expiraEn: expiraEn,
        nombreHost: "Cliente QR" // Auditoría
      },
    });
  } else {
    console.log(`🔄 Reutilizando sesión existente para Mesa: ${mesa.nombre}`);
  }

  // 3. REDIRECCIÓN FINAL
  // Redirigimos al usuario a la misma página, pero ahora con el TOKEN DE SESIÓN (Estrategia 1)
  redirect(`/mesa/${sesionMesa.tokenEfimero}`);
}