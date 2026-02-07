/**
 * Script de emergencia: Poblar BD con datos mínimos para poder loguearse.
 * Ejecutar: npx tsx scripts/fix-login.ts
 *
 * Es idempotente: si ya existen los datos, los actualiza en lugar de fallar.
 * Orden estricto (respeta Foreign Keys): Local → Usuario → Sector → Mesa
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "bar-central";
const EMAIL = "birreria@gmail.com";
const PASSWORD = "123";

async function main() {
  console.log("🚀 Iniciando fix-login...\n");

  // 1. Crear o obtener Local
  const local = await prisma.local.upsert({
    where: { slug: SLUG },
    create: {
      nombre: "Bar Central",
      direccion: "Av. Principal 100",
      slug: SLUG,
      estado: "ACTIVO",
    },
    update: { estado: "ACTIVO" },
  });
  console.log("✅ Local listo:", local.nombre, `(id: ${local.id})`);

  // 2. Crear o actualizar Usuario ADMIN
  const usuario = await prisma.usuario.upsert({
    where: { email: EMAIL },
    create: {
      nombre: "Admin Bar Central",
      email: EMAIL,
      password: PASSWORD,
      rol: "ADMIN",
      activo: true,
      localId: local.id,
    },
    update: {
      password: PASSWORD,
      rol: "ADMIN",
      activo: true,
      localId: local.id,
    },
  });
  console.log("✅ Usuario listo:", usuario.email, `(rol: ${usuario.rol})`);

  // 3. Crear o obtener Sector
  const sector = await prisma.sector.upsert({
    where: {
      localId_nombre: { localId: local.id, nombre: "General" },
    },
    create: {
      nombre: "General",
      orden: 1,
      localId: local.id,
    },
    update: {},
  });
  console.log("✅ Sector listo:", sector.nombre);

  // 4. Crear Mesa si no existe
  let mesa = await prisma.mesa.findFirst({
    where: { localId: local.id, nombre: "Mesa 1" },
  });
  if (!mesa) {
    mesa = await prisma.mesa.create({
      data: {
        nombre: "Mesa 1",
        sector: sector.nombre,
        localId: local.id,
        activo: true,
      },
    });
    console.log("✅ Mesa creada:", mesa.nombre);
  } else {
    console.log("✅ Mesa ya existe:", mesa.nombre);
  }

  console.log("\n🎉 FIX-LOGIN COMPLETADO");
  console.log("─────────────────────────────");
  console.log("📧 Email:    birreria@gmail.com");
  console.log("🔑 Password: 123");
  console.log("─────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
