import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mesaToken, nombreCliente, productos } = body;

    // 1. VALIDACIÓN BÁSICA
    if (!mesaToken || !productos || productos.length === 0) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 2. BUSCAR LA MESA
    const mesa = await prisma.mesa.findUnique({ where: { qr_token: mesaToken }});
    if (!mesa) return NextResponse.json({ error: "Mesa incorrecta" }, { status: 404 });

    // 3. LOGICA DE SESIÓN (Unir amigos)
    // Buscamos si ya hay una sesión "Abierta" (sin fecha fin) en esta mesa
    let sesion = await prisma.sesion.findFirst({
      where: {
        mesaId: mesa.id,
        fechaFin: null 
      }
    });

    // Si no hay nadie sentado (sesión cerrada o nueva), abrimos una
    if (!sesion) {
      sesion = await prisma.sesion.create({
        data: { mesaId: mesa.id }
      });
      console.log(`✨ Nueva sesión creada en ${mesa.nombre}`);
    } else {
      console.log(`👥 Sumando pedido a sesión existente en ${mesa.nombre}`);
    }

    // 4. BUSCAR PRECIOS REALES (Seguridad)
    // No confiamos en el precio que manda el celular (podrían hackearlo). Buscamos en la BD.
    const idsProductos = productos.map((p: any) => p.productoId);
    const productosDb = await prisma.producto.findMany({
      where: { id: { in: idsProductos } }
    });

    // 5. ARMAR LOS ITEMS DEL PEDIDO
    const itemsParaGuardar = productos.map((prodFront: any) => {
      const infoReal = productosDb.find(p => p.id === prodFront.productoId);
      return {
        productoId: prodFront.productoId,
        cantidad: prodFront.cantidad,
        precio: infoReal ? infoReal.precio : 0, // Guardamos el precio histórico
        observaciones: ""
      };
    });

    // 6. GUARDAR EL PEDIDO EN LA BASE DE DATOS
    const nuevoPedido = await prisma.pedido.create({
      data: {
        sesionId: sesion.id,
        nombreCliente: nombreCliente || "Anónimo",
        estado: "PENDIENTE", // Va a cocina
        items: {
          create: itemsParaGuardar
        }
      }
    });

    return NextResponse.json({ success: true, pedidoId: nuevoPedido.id });

  } catch (error) {
    console.error("Error al procesar pedido:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}