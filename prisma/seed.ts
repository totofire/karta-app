/**
 * KARTA SUPER SEED — versión optimizada (batches + createMany)
 * Ejecutar: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { subDays, addMinutes } from "date-fns";

const prisma = new PrismaClient({ log: [] });
const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const rnd    = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const uuid   = () => crypto.randomUUID();

const VOLUMEN_DIA = [8, 5, 5, 6, 9, 14, 12];

function fechaEnDia(base: Date, horaMin = 12, horaMax = 23): Date {
  const d = new Date(base);
  d.setHours(rnd(horaMin, horaMax), rnd(0, 59), 0, 0);
  return d;
}

async function generarHistorial(
  localId: number,
  mesas: any[],
  productos: any[],
  dias: number,
  factorVolumen = 1.0
) {
  const sesionesData: any[] = [];

  for (let d = dias; d >= 1; d--) {
    const base       = subDays(new Date(), d);
    const diaSemana  = base.getDay();
    const numSesiones = Math.round(VOLUMEN_DIA[diaSemana] * factorVolumen * rnd(8, 12) / 10);

    for (let s = 0; s < numSesiones; s++) {
      const fechaInicio = fechaEnDia(base, 12, 23);
      const fechaFin    = addMinutes(fechaInicio, rnd(40, 130));
      const numPedidos  = rnd(1, 3);
      let   totalSesion = 0;
      const pedidos: any[] = [];

      for (let p = 0; p < numPedidos; p++) {
        const fechaPedido   = addMinutes(fechaInicio, p * rnd(15, 25));
        const fechaDespacho = addMinutes(fechaPedido, rnd(8, 25));
        const items: any[]  = [];
        for (let i = 0; i < rnd(1, 5); i++) {
          const prod     = random(productos);
          const cantidad = rnd(1, 3);
          items.push({ productoId: prod.id, cantidad, precio: prod.precio });
          totalSesion += prod.precio * cantidad;
        }
        pedidos.push({ fecha: fechaPedido, fechaDespacho, items });
      }

      sesionesData.push({
        mesaId: random(mesas).id, localId,
        fechaInicio, fechaFin,
        tokenEfimero: uuid(), nombreHost: "Cliente",
        totalVenta: totalSesion,
        _pedidos: pedidos,
      });
    }
  }

  const BATCH = 60;
  for (let i = 0; i < sesionesData.length; i += BATCH) {
    const batch = sesionesData.slice(i, i + BATCH);
    const sesionesInsert = batch.map(({ _pedidos, ...s }) => s);
    await prisma.sesion.createMany({ data: sesionesInsert });

    const tokens   = batch.map((s) => s.tokenEfimero);
    const sesionesDB = await prisma.sesion.findMany({
      where: { tokenEfimero: { in: tokens } },
      select: { id: true, tokenEfimero: true },
    });
    const tokenToId = new Map(sesionesDB.map((s) => [s.tokenEfimero, s.id]));

    const pedidosInsert: any[] = [];
    for (const sesion of batch) {
      const sesionId = tokenToId.get(sesion.tokenEfimero);
      if (!sesionId) continue;
      for (const p of sesion._pedidos) {
        pedidosInsert.push({ sesionId, localId, nombreCliente: "Cliente", estado: "ENTREGADO", fecha: p.fecha, fechaDespacho: p.fechaDespacho });
      }
    }
    if (pedidosInsert.length > 0) await prisma.pedido.createMany({ data: pedidosInsert });

    const sesionIds  = [...tokenToId.values()];
    const pedidosDB  = await prisma.pedido.findMany({
      where: { sesionId: { in: sesionIds } },
      select: { id: true, sesionId: true },
      orderBy: { id: "asc" },
    });

    const itemsInsert: any[] = [];
    for (const sesion of batch) {
      const sesionId = tokenToId.get(sesion.tokenEfimero);
      if (!sesionId) continue;
      const pedidosDeSesion = pedidosDB.filter((p) => p.sesionId === sesionId);
      for (let pi = 0; pi < sesion._pedidos.length && pi < pedidosDeSesion.length; pi++) {
        for (const item of sesion._pedidos[pi].items) {
          itemsInsert.push({ pedidoId: pedidosDeSesion[pi].id, ...item, estado: "ENTREGADO" });
        }
      }
    }
    if (itemsInsert.length > 0) await prisma.itemPedido.createMany({ data: itemsInsert });

    process.stdout.write(`\r   ↳ ${Math.min(i + BATCH, sesionesData.length)}/${sesionesData.length} sesiones`);
  }
  console.log("");
}

async function abrirMesa(mesa: any, localId: number, productos: any[]) {
  const fechaInicio = addMinutes(new Date(), -rnd(30, 90));
  const sesion = await prisma.sesion.create({
    data: { mesaId: mesa.id, localId, fechaInicio, tokenEfimero: uuid(), nombreHost: "Cliente" },
  });
  const pedido = await prisma.pedido.create({
    data: { sesionId: sesion.id, localId, nombreCliente: "Cliente", estado: "PENDIENTE", fecha: addMinutes(fechaInicio, 5) },
  });
  const prod = random(productos);
  await prisma.itemPedido.create({
    data: { pedidoId: pedido.id, productoId: prod.id, cantidad: rnd(1, 3), precio: prod.precio, estado: "PENDIENTE" },
  });
}

async function main() {
  console.log("🌱 KARTA SUPER SEED iniciando...\n");

  console.log("🧹 Limpiando base de datos...");
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.sesion.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.mesa.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.configuracion.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.local.deleteMany();

  console.log("👑 Creando Super Admin...");
  await prisma.usuario.create({
    data: { email: "tomi@karta.app", password: "123", nombre: "Tomas (Super Admin)", rol: "SUPER_ADMIN", activo: true },
  });

  // ── LOCAL 1: KARTA BAR — PRO ──────────────────────────────────────────────
  console.log("\n🍔 LOCAL 1: Karta Bar (PRO)");
  const local1 = await prisma.local.create({
    data: { nombre: "Karta Bar", slug: "karta-bar", estado: "ACTIVO", plan: "PRO", montoPlan: 35000, fechaVence: addMinutes(new Date(), 30*24*60) },
  });
  await prisma.configuracion.create({ data: { localId: local1.id } });
  await prisma.usuario.createMany({ data: [
    { email: "admin@karta.com",  password: "123", nombre: "Dueño Karta Bar", rol: "ADMIN", activo: true, localId: local1.id },
    { email: "mozo1@karta.com",  password: "123", nombre: "Juan (Mozo)",     rol: "MOZO",  activo: true, localId: local1.id },
    { email: "mozo2@karta.com",  password: "123", nombre: "Paula (Moza)",    rol: "MOZO",  activo: true, localId: local1.id },
  ]});
  await prisma.sector.createMany({ data: [
    { nombre: "Patio",   orden: 1, localId: local1.id },
    { nombre: "Salón",   orden: 2, localId: local1.id },
    { nombre: "Terraza", orden: 3, localId: local1.id },
  ]});
  const mesas1 = await Promise.all([
    prisma.mesa.create({ data: { nombre: "Mesa 1", sector: "Patio",   localId: local1.id, posX: 60,  posY: 60  } }),
    prisma.mesa.create({ data: { nombre: "Mesa 2", sector: "Patio",   localId: local1.id, posX: 200, posY: 60  } }),
    prisma.mesa.create({ data: { nombre: "Mesa 3", sector: "Salón",   localId: local1.id, posX: 60,  posY: 220 } }),
    prisma.mesa.create({ data: { nombre: "Mesa 4", sector: "Salón",   localId: local1.id, posX: 200, posY: 220 } }),
    prisma.mesa.create({ data: { nombre: "Mesa 5", sector: "Salón",   localId: local1.id, posX: 340, posY: 220 } }),
    prisma.mesa.create({ data: { nombre: "VIP 1",  sector: "Terraza", localId: local1.id, posX: 60,  posY: 380 } }),
    prisma.mesa.create({ data: { nombre: "VIP 2",  sector: "Terraza", localId: local1.id, posX: 200, posY: 380 } }),
  ]);
  const [catB1,catB2,catB3,catB4] = await Promise.all([
    prisma.categoria.create({ data: { nombre: "Hamburguesas", orden: 1, imprimirCocina: true,  localId: local1.id } }),
    prisma.categoria.create({ data: { nombre: "Bebidas",      orden: 2, imprimirCocina: false, localId: local1.id } }),
    prisma.categoria.create({ data: { nombre: "Entradas",     orden: 3, imprimirCocina: true,  localId: local1.id } }),
    prisma.categoria.create({ data: { nombre: "Postres",      orden: 4, imprimirCocina: true,  localId: local1.id } }),
  ]);
  const prods1 = await Promise.all([
    prisma.producto.create({ data: { nombre: "Doble Bacon",         precio: 9500,  categoriaId: catB1.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: "Royal Cheese",        precio: 8500,  categoriaId: catB1.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: "Veggie Burger",       precio: 8000,  categoriaId: catB1.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: "Pinta IPA",           precio: 4500,  categoriaId: catB2.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: "Coca Cola",           precio: 3000,  categoriaId: catB2.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: "Agua con Gas",        precio: 2000,  categoriaId: catB2.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: "Papas Cheddar",       precio: 6000,  categoriaId: catB3.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: "Bastones Muzzarella", precio: 7000,  categoriaId: catB3.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: "Brownie con Helado",  precio: 5500,  categoriaId: catB4.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: "Cheesecake",          precio: 5000,  categoriaId: catB4.id, localId: local1.id } }),
  ]);
  await generarHistorial(local1.id, mesas1, prods1, 90, 1.3);
  for (const m of [mesas1[0], mesas1[2], mesas1[5]]) await abrirMesa(m, local1.id, prods1);

  // ── LOCAL 2: LA CANTINA — BASIC ──────────────────────────────────────────
  console.log("\n🍝 LOCAL 2: La Cantina (BASIC)");
  const local2 = await prisma.local.create({
    data: { nombre: "La Cantina", slug: "la-cantina", estado: "ACTIVO", plan: "BASIC", montoPlan: 18000, fechaVence: addMinutes(new Date(), 15*24*60) },
  });
  await prisma.configuracion.create({ data: { localId: local2.id } });
  await prisma.usuario.createMany({ data: [
    { email: "admin@lacantina.com", password: "123", nombre: "Roberto (Dueño)", rol: "ADMIN", activo: true, localId: local2.id },
    { email: "mozo@lacantina.com",  password: "123", nombre: "Sergio (Mozo)",   rol: "MOZO",  activo: true, localId: local2.id },
  ]});
  await prisma.sector.createMany({ data: [
    { nombre: "Salón principal", orden: 1, localId: local2.id },
    { nombre: "Barra",           orden: 2, localId: local2.id },
  ]});
  const mesas2 = await Promise.all(
    ["M1","M2","M3","M4","Barra 1","Barra 2"].map((nombre, i) =>
      prisma.mesa.create({ data: { nombre, sector: i < 4 ? "Salón principal" : "Barra", localId: local2.id, posX: (i%3)*140+60, posY: Math.floor(i/3)*160+60 } })
    )
  );
  const [catC1,catC2,catC3] = await Promise.all([
    prisma.categoria.create({ data: { nombre: "Pastas",  orden: 1, imprimirCocina: true,  localId: local2.id } }),
    prisma.categoria.create({ data: { nombre: "Pizzas",  orden: 2, imprimirCocina: true,  localId: local2.id } }),
    prisma.categoria.create({ data: { nombre: "Bebidas", orden: 3, imprimirCocina: false, localId: local2.id } }),
  ]);
  const prods2 = await Promise.all([
    prisma.producto.create({ data: { nombre: "Ñoquis al Fileto",     precio: 7500,  categoriaId: catC1.id, localId: local2.id } }),
    prisma.producto.create({ data: { nombre: "Tallarines Bolognesa", precio: 7000,  categoriaId: catC1.id, localId: local2.id } }),
    prisma.producto.create({ data: { nombre: "Canelones",            precio: 8000,  categoriaId: catC1.id, localId: local2.id } }),
    prisma.producto.create({ data: { nombre: "Pizza Muzzarella",     precio: 10000, categoriaId: catC2.id, localId: local2.id } }),
    prisma.producto.create({ data: { nombre: "Pizza Fugazzeta",      precio: 11000, categoriaId: catC2.id, localId: local2.id } }),
    prisma.producto.create({ data: { nombre: "Vino de la Casa",      precio: 6000,  categoriaId: catC3.id, localId: local2.id } }),
    prisma.producto.create({ data: { nombre: "Gaseosa",              precio: 2500,  categoriaId: catC3.id, localId: local2.id } }),
  ]);
  await generarHistorial(local2.id, mesas2, prods2, 90, 0.8);
  await abrirMesa(mesas2[0], local2.id, prods2);

  // ── LOCAL 3: ROOFTOP 360 — ENTERPRISE ────────────────────────────────────
  console.log("\n🍸 LOCAL 3: Rooftop 360 (ENTERPRISE)");
  const local3 = await prisma.local.create({
    data: { nombre: "Rooftop 360", slug: "rooftop-360", estado: "ACTIVO", plan: "ENTERPRISE", montoPlan: 75000, fechaVence: addMinutes(new Date(), 25*24*60) },
  });
  await prisma.configuracion.create({ data: { localId: local3.id } });
  await prisma.usuario.createMany({ data: [
    { email: "admin@rooftop.com",  password: "123", nombre: "Valentina (Dueña)", rol: "ADMIN", activo: true, localId: local3.id },
    { email: "mozo1@rooftop.com",  password: "123", nombre: "Lucía (Moza)",      rol: "MOZO",  activo: true, localId: local3.id },
    { email: "mozo2@rooftop.com",  password: "123", nombre: "Marcos (Mozo)",     rol: "MOZO",  activo: true, localId: local3.id },
  ]});
  await prisma.sector.createMany({ data: [
    { nombre: "Deck principal", orden: 1, localId: local3.id },
    { nombre: "Barra VIP",     orden: 2, localId: local3.id },
    { nombre: "Área privada",  orden: 3, localId: local3.id },
  ]});
  const mesas3 = await Promise.all([
    ...[1,2,3,4,5].map(n => prisma.mesa.create({ data: { nombre: `Deck ${n}`, sector: "Deck principal", localId: local3.id, posX: (n-1)*120+60, posY: 60 } })),
    ...[1,2].map(n =>      prisma.mesa.create({ data: { nombre: `VIP ${n}`,   sector: "Barra VIP",     localId: local3.id, posX: (n-1)*160+60, posY: 240 } })),
    prisma.mesa.create({ data: { nombre: "Privada", sector: "Área privada", localId: local3.id, posX: 60, posY: 400 } }),
  ]);
  const [catR1,catR2,catR3] = await Promise.all([
    prisma.categoria.create({ data: { nombre: "Cocktails",   orden: 1, imprimirCocina: false, localId: local3.id } }),
    prisma.categoria.create({ data: { nombre: "Tapas",       orden: 2, imprimirCocina: true,  localId: local3.id } }),
    prisma.categoria.create({ data: { nombre: "Principales", orden: 3, imprimirCocina: true,  localId: local3.id } }),
  ]);
  const prods3 = await Promise.all([
    prisma.producto.create({ data: { nombre: "Negroni",         precio: 8000,  categoriaId: catR1.id, localId: local3.id } }),
    prisma.producto.create({ data: { nombre: "Aperol Spritz",   precio: 7500,  categoriaId: catR1.id, localId: local3.id } }),
    prisma.producto.create({ data: { nombre: "Old Fashioned",   precio: 9000,  categoriaId: catR1.id, localId: local3.id } }),
    prisma.producto.create({ data: { nombre: "Tabla de Quesos", precio: 18000, categoriaId: catR2.id, localId: local3.id } }),
    prisma.producto.create({ data: { nombre: "Ceviche",         precio: 15000, categoriaId: catR2.id, localId: local3.id } }),
    prisma.producto.create({ data: { nombre: "Bife Angosto",    precio: 28000, categoriaId: catR3.id, localId: local3.id } }),
    prisma.producto.create({ data: { nombre: "Salmon Grillado", precio: 24000, categoriaId: catR3.id, localId: local3.id } }),
  ]);
  await generarHistorial(local3.id, mesas3, prods3, 90, 1.6);
  for (const m of [mesas3[0], mesas3[6]]) await abrirMesa(m, local3.id, prods3);

  // ── LOCAL 4: PIZZA EXPRESS — DEMO, trial vence en 3 días ─────────────────
  console.log("\n🍕 LOCAL 4: Pizza Express (DEMO — trial expirando)");
  const local4 = await prisma.local.create({
    data: { nombre: "Pizza Express", slug: "pizza-express", estado: "DEMO", plan: "DEMO", montoPlan: 0, trialHasta: addMinutes(new Date(), 3*24*60) },
  });
  await prisma.configuracion.create({ data: { localId: local4.id } });
  await prisma.usuario.create({
    data: { email: "dueno@pizzaexpress.com", nombre: "Carlos (Pizza Express)", rol: "ADMIN", activo: false, localId: local4.id, inviteToken: "demo-invite-token-pizza-12345", inviteExpira: addMinutes(new Date(), 48*60) },
  });
  const mesas4 = await Promise.all(
    ["M1","M2","M3","M4"].map((nombre, i) =>
      prisma.mesa.create({ data: { nombre, sector: "Salón", localId: local4.id, posX: i*130+60, posY: 60 } })
    )
  );
  const catP1 = await prisma.categoria.create({ data: { nombre: "Pizzas",  orden: 1, imprimirCocina: true,  localId: local4.id } });
  const catP2 = await prisma.categoria.create({ data: { nombre: "Bebidas", orden: 2, imprimirCocina: false, localId: local4.id } });
  const prods4 = await Promise.all([
    prisma.producto.create({ data: { nombre: "Pizza Muzzarella", precio: 9000, categoriaId: catP1.id, localId: local4.id } }),
    prisma.producto.create({ data: { nombre: "Pizza Napolitana", precio: 9500, categoriaId: catP1.id, localId: local4.id } }),
    prisma.producto.create({ data: { nombre: "Coca Cola",        precio: 2500, categoriaId: catP2.id, localId: local4.id } }),
  ]);
  await generarHistorial(local4.id, mesas4, prods4, 10, 0.5);

  // ── LOCAL 5: SUSHI NEKO — SUSPENDIDO ─────────────────────────────────────
  console.log("\n🍣 LOCAL 5: Sushi Neko (SUSPENDIDO)");
  const local5 = await prisma.local.create({
    data: { nombre: "Sushi Neko", slug: "sushi-neko", estado: "SUSPENDIDO", plan: "PRO", montoPlan: 35000, notasAdmin: "Suspendido 10/02 por falta de pago. Contactar a Fernanda." },
  });
  await prisma.configuracion.create({ data: { localId: local5.id } });
  await prisma.usuario.create({
    data: { email: "admin@sushineko.com", password: "123", nombre: "Fernanda (Sushi Neko)", rol: "ADMIN", activo: false, localId: local5.id },
  });
  const mesas5 = await Promise.all(
    ["Barra 1","Barra 2","Mesa A","Mesa B","Mesa C"].map((nombre, i) =>
      prisma.mesa.create({ data: { nombre, sector: i < 2 ? "Barra" : "Salón", localId: local5.id, posX: i*120+60, posY: 60 } })
    )
  );
  const catS1 = await prisma.categoria.create({ data: { nombre: "Rolls",   orden: 1, imprimirCocina: true,  localId: local5.id } });
  const catS2 = await prisma.categoria.create({ data: { nombre: "Bebidas", orden: 2, imprimirCocina: false, localId: local5.id } });
  const prods5 = await Promise.all([
    prisma.producto.create({ data: { nombre: "California Roll x8", precio: 11000, categoriaId: catS1.id, localId: local5.id } }),
    prisma.producto.create({ data: { nombre: "Spicy Tuna x8",      precio: 12000, categoriaId: catS1.id, localId: local5.id } }),
    prisma.producto.create({ data: { nombre: "Sake",               precio: 5000,  categoriaId: catS2.id, localId: local5.id } }),
  ]);
  await generarHistorial(local5.id, mesas5, prods5, 60, 1.0);

  console.log("\n\n✅ SEED COMPLETADO");
  console.log("═══════════════════════════════════════════════════");
  console.log("👑 SUPER ADMIN        tomi@karta.app / 123");
  console.log("───────────────────────────────────────────────────");
  console.log("🍔 Karta Bar (PRO)    admin@karta.com / 123");
  console.log("                     mozo1@karta.com / 123");
  console.log("🍝 La Cantina (BASIC) admin@lacantina.com / 123");
  console.log("🍸 Rooftop (ENTER.)   admin@rooftop.com / 123");
  console.log("🍕 Pizza Express      dueno@pizzaexpress.com ← sin activar");
  console.log("🍣 Sushi Neko         SUSPENDIDO");
  console.log("═══════════════════════════════════════════════════");
}

main()
  .catch((e) => { console.error("\n❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());