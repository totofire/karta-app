import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Define el tipo para los productos que vienen del frontend
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

    // 2. BUSCAR SESIÓN
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

    // 4. BUSCAR PRECIOS REALES
    const idsProductos = productos.map((p: ProductoRequest) => p.productoId);
    
    const productosDb = await prisma.producto.findMany({
      where: { id: { in: idsProductos } }
    });

    // 5. ARMAR ITEMS
    const itemsParaGuardar = productos.map((prodFront: ProductoRequest) => {
      
      // 🔥 CORRECCIÓN AQUÍ: Agregamos (p: any) para callar a TypeScript
      const infoReal = productosDb.find((p: any) => p.id === prodFront.productoId);
      
      return {
        productoId: prodFront.productoId,
        cantidad: prodFront.cantidad,
        precio: infoReal ? infoReal.precio : 0,
        observaciones: prodFront.observaciones || ""
      };
    });

    // 6. GUARDAR PEDIDO
    const nuevoPedido = await prisma.pedido.create({
      data: {
        sesionId: sesion.id,
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