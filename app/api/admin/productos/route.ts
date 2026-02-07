import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic';

async function getLocalId(req: Request): Promise<number | null> {
  const tokenCookie = req.headers.get("cookie")?.split("; ").find(c => c.startsWith("token="));
  if (!tokenCookie) return null;
  const token = tokenCookie.split("=")[1];
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);
    return payload.localId as number;
  } catch {
    return null;
  }
}

const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  precio: z.number().min(0, "El precio no puede ser negativo"),
  categoriaId: z.number().int().positive("Categoría inválida"),
  descripcion: z.string().optional(),
  imagen: z.string().url("La URL de imagen no es válida").optional().nullable(),
  activo: z.boolean().default(true),
});

export async function GET(req: Request) {
  const localId = await getLocalId(req);
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
  const localId = await getLocalId(req);
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();

    const resultado = productoSchema.safeParse(body);

    if (!resultado.success) {
      return NextResponse.json({ 
        error: resultado.error.issues[0].message 
      }, { status: 400 });
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