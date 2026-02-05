import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// Validación con Zod (incluyendo imagen)
const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  precio: z.number().min(0, "El precio no puede ser negativo"),
  categoriaId: z.number().int().positive("Categoría inválida"),
  descripcion: z.string().optional(),
  imagen: z.string().url("La URL de imagen no es válida").optional().nullable(),
  activo: z.boolean().default(true),
});

// GET: Traer productos con imágenes
export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      include: {
        productos: {
          orderBy: { orden: 'asc' }
        }
      },
      orderBy: { orden: 'asc' }
    });
    return NextResponse.json(categorias);
  } catch (error) {
    console.error("Error en GET productos:", error);
    return NextResponse.json({ error: "Error cargando productos" }, { status: 500 });
  }
}

// POST: Crear producto con imagen
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validar con Zod
    const resultado = productoSchema.safeParse(body);

    if (!resultado.success) {
      return NextResponse.json({ 
        error: resultado.error.issues[0].message 
      }, { status: 400 });
    }

    // Crear producto con imagen
    const nuevoProducto = await prisma.producto.create({
      data: {
        nombre: resultado.data.nombre,
        precio: resultado.data.precio,
        categoriaId: resultado.data.categoriaId,
        descripcion: resultado.data.descripcion || "",
        imagen: resultado.data.imagen || null,
        activo: resultado.data.activo,
      }
    });

    return NextResponse.json(nuevoProducto);

  } catch (error) {
    console.error("Error en POST productos:", error);
    return NextResponse.json({ error: "Error creando producto" }, { status: 500 });
  }
}