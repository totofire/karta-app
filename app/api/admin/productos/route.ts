import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  precio: z.coerce.number().min(0, "El precio no puede ser negativo"),
  categoriaId: z.coerce.number().int().positive("Categoría inválida"),
  descripcion: z.string().optional(),
  imagen: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  activo: z.boolean().default(true),
});

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const categorias = await prisma.categoria.findMany({
      where: { localId: localId }, // <--- FILTRO DE LOCAL
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

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();

    const resultado = productoSchema.safeParse(body);

    if (!resultado.success) {
      const zodError = resultado.error;
      console.error("❌ POST /productos - Zod validation failed:", JSON.stringify(zodError.issues, null, 2));
      return NextResponse.json(
        {
          error: zodError.issues[0]?.message ?? "Datos inválidos",
          details: zodError.issues,
        },
        { status: 400 }
      );
    }

    const nuevoProducto = await prisma.producto.create({
      data: {
        nombre: resultado.data.nombre,
        precio: resultado.data.precio,
        categoriaId: resultado.data.categoriaId,
        descripcion: resultado.data.descripcion || "",
        imagen: resultado.data.imagen || null,
        activo: resultado.data.activo,
        localId: localId // <--- ASIGNACIÓN AUTOMÁTICA
      }
    });

    return NextResponse.json(nuevoProducto);

  } catch (error) {
    console.error("Error en POST productos:", error);
    return NextResponse.json({ error: "Error creando producto" }, { status: 500 });
  }
}