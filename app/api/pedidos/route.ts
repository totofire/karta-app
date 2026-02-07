import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ProductoRequest {
  productoId: number;
  cantidad: number;
  observaciones?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenEfimero, nombreCliente, productos } = body;

    // 1. VALIDACIÓN BÁSICA
    if (!tokenEfimero || !productos || productos.length === 0) {
      return NextResponse.json({ error: "Faltan datos del pedido" }, { status: 400 });
    }

    // 2. BUSCAR SESIÓN (y traemos la mesa para saber de qué LOCAL es)
    const sesion = await prisma.sesion.findUnique({
      where: { tokenEfimero },
      include: { mesa: true }
    });

    // 3. VALIDACIONES DE SEGURIDAD
    if (!sesion) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 403 });
    }
    if (sesion.fechaFin) {
      return NextResponse.json({ error: "Mesa cerrada. Escaneá QR nuevo." }, { status: 410 });
    }
    if (sesion.expiraEn && sesion.expiraEn < new Date()) {
      return NextResponse.json({ error: "Sesión expirada. Escaneá QR nuevo." }, { status: 410 });
    }

    // 🔥 DATO CLAVE: El localId viene de la mesa, no de una cookie de usuario
    const localIdDelBar = sesion.mesa.localId;

    // 4. BUSCAR PRECIOS REALES (Asegurando que sean productos de ESTE local)
    const idsProductos = productos.map((p: ProductoRequest) => p.productoId);
    
    const productosDb = await prisma.producto.findMany({
      where: { 
        id: { in: idsProductos },
        localId: localIdDelBar // <--- SEGURIDAD: Solo productos de este bar
      }
    });

    // 5. ARMAR ITEMS
    const itemsParaGuardar = productos.map((prodFront: ProductoRequest) => {
      // Verificamos que el producto exista en la lista aprobada
      const infoReal = productosDb.find((p: any) => p.id === prodFront.productoId);
      
      if (!infoReal) return null; // Si intenta pedir un producto de otro bar, lo ignoramos

      return {
        productoId: prodFront.productoId,
        cantidad: prodFront.cantidad,
        precio: infoReal.precio,
        observaciones: prodFront.observaciones || ""
      };
    }).filter((item: any) => item !== null); // Filtramos nulos

    if (itemsParaGuardar.length === 0) {
        return NextResponse.json({ error: "Productos no válidos para este local" }, { status: 400 });
    }

    // 6. GUARDAR PEDIDO (Inyectando localId)
    const nuevoPedido = await prisma.pedido.create({
      data: {
        sesionId: sesion.id,
        localId: localIdDelBar, // <--- IMPORTANTÍSIMO para que la cocina lo vea
        nombreCliente: nombreCliente || "Anónimo",
        estado: "PENDIENTE",
        items: {
          create: itemsParaGuardar
        }
      },
      include: {
        items: {
          include: { producto: true }
        } 
      }
    });
  
    return NextResponse.json({ success: true, pedidoId: nuevoPedido.id });

  } catch (error) {
    console.error("Error al procesar pedido:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}