import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed maestro Karta...');

  // 1. LIMPIEZA TOTAL (Orden inverso para evitar conflictos de claves foráneas)
  const tablenames = [
    'ItemPedido', 'Pedido', 'Sesion', 
    'Producto', 'Categoria', 'Mesa', 'Sector', 
    'Configuracion', 'Usuario', 'Local'
  ];

  for (const tableName of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
    } catch (error) {
      console.log(`⚠️ No se pudo truncar "${tableName}", intentando deleteMany...`);
      // @ts-ignore
      await prisma[tableName.toLowerCase()].deleteMany();
    }
  }

  console.log('🧹 Base de datos limpia.');

  // =====================================================================
  // 2. CREACIÓN DE LOCALES
  // =====================================================================

  const localBirreria = await prisma.local.create({
    data: { 
      nombre: 'La Birrería del Centro', 
      direccion: 'Av. Libertador 1234', 
      slug: 'birreria-centro',
      estado: 'ACTIVO' // <--- IMPORTANTE
    }
  });

  const localCafe = await prisma.local.create({
    data: { 
      nombre: 'Café París', 
      direccion: 'Calle Falsa 123', 
      slug: 'cafe-paris',
      estado: 'ACTIVO'
    }
  });

  const localPizzeria = await prisma.local.create({
    data: { 
      nombre: 'Pizzería Napoli', 
      direccion: 'Italia 900', 
      slug: 'pizzeria-napoli',
      estado: 'ACTIVO'
    }
  });

  console.log('🏢 3 Locales creados.');

  // =====================================================================
  // 3. CREACIÓN DE USUARIOS
  // =====================================================================

  // Super Admin (VOS)
  await prisma.usuario.create({
    data: {
      nombre: 'Toto Admin',
      email: 'superadmin@karta.com',
      password: '123',
      rol: 'SUPER_ADMIN',
      localId: null, // No pertenece a ninguno, ve todo
      activo: true
    }
  });

  // Dueño Birrería
  await prisma.usuario.create({
    data: {
      nombre: 'Juan Birrero',
      email: 'birreria@gmail.com',
      password: '123',
      rol: 'ADMIN',
      localId: localBirreria.id,
      activo: true
    }
  });

  // Mozo Birrería
  await prisma.usuario.create({
    data: {
      nombre: 'Pedro Mozo',
      email: 'mozo@birreria.com',
      password: '123',
      rol: 'MOZO',
      localId: localBirreria.id,
      activo: true
    }
  });

  // Dueño Café
  await prisma.usuario.create({
    data: {
      nombre: 'Maria Cafetera',
      email: 'cafe@gmail.com',
      password: '123',
      rol: 'ADMIN',
      localId: localCafe.id,
      activo: true
    }
  });

  console.log('👥 Usuarios creados.');

  // =====================================================================
  // 4. DATOS PARA LA BIRRERÍA
  // =====================================================================

  // Sectores
  const b_sectorInterior = await prisma.sector.create({ data: { nombre: 'Salón Principal', orden: 1, localId: localBirreria.id } });
  const b_sectorPatio = await prisma.sector.create({ data: { nombre: 'Patio Cervecero', orden: 2, localId: localBirreria.id } });

  // Mesas
  await prisma.mesa.createMany({
    data: [
      { nombre: 'Mesa 1', qr_token: 'b_m1', sector: b_sectorInterior.nombre, localId: localBirreria.id },
      { nombre: 'Mesa 2', qr_token: 'b_m2', sector: b_sectorInterior.nombre, localId: localBirreria.id },
      { nombre: 'Mesa 3', qr_token: 'b_m3', sector: b_sectorInterior.nombre, localId: localBirreria.id },
      { nombre: 'Patio 1', qr_token: 'b_p1', sector: b_sectorPatio.nombre, localId: localBirreria.id },
      { nombre: 'Patio 2', qr_token: 'b_p2', sector: b_sectorPatio.nombre, localId: localBirreria.id },
    ]
  });

  // Categorías
  const b_cat_burgers = await prisma.categoria.create({ data: { nombre: 'Hamburguesas', orden: 1, imprimirCocina: true, localId: localBirreria.id } });
  const b_cat_papas = await prisma.categoria.create({ data: { nombre: 'Papas & Picadas', orden: 2, imprimirCocina: true, localId: localBirreria.id } });
  const b_cat_birras = await prisma.categoria.create({ data: { nombre: 'Cervezas Tiradas', orden: 3, imprimirCocina: false, localId: localBirreria.id } });
  const b_cat_tragos = await prisma.categoria.create({ data: { nombre: 'Tragos de Autor', orden: 4, imprimirCocina: false, localId: localBirreria.id } });

  // Productos
  await prisma.producto.createMany({
    data: [
      // Burgers
      { nombre: 'Doble Cheeseburger', descripcion: 'Doble carne, doble cheddar, salsa mil islas', precio: 8500, categoriaId: b_cat_burgers.id, localId: localBirreria.id, orden: 1 },
      { nombre: 'Oklahoma Onion', descripcion: 'Carne smasheada con cebolla, cheddar', precio: 7800, categoriaId: b_cat_burgers.id, localId: localBirreria.id, orden: 2 },
      { nombre: 'Crispy Bacon', descripcion: 'Cheddar, panceta crocante, huevo', precio: 9200, categoriaId: b_cat_burgers.id, localId: localBirreria.id, orden: 3 },
      // Papas
      { nombre: 'Papas con Cheddar', descripcion: 'Bastones crocantes con salsa cheddar', precio: 5000, categoriaId: b_cat_papas.id, localId: localBirreria.id, orden: 1 },
      { nombre: 'Aros de Cebolla', descripcion: 'Con dip de barbacoa', precio: 4500, categoriaId: b_cat_papas.id, localId: localBirreria.id, orden: 2 },
      // Birras
      { nombre: 'IPA Atomica', descripcion: 'Lupulada y cítrica. 6.5% ABV', precio: 3500, categoriaId: b_cat_birras.id, localId: localBirreria.id, orden: 1 },
      { nombre: 'Honey Beer', descripcion: 'Dulce con miel orgánica', precio: 3200, categoriaId: b_cat_birras.id, localId: localBirreria.id, orden: 2 },
      { nombre: 'Scottish Red', descripcion: 'Roja, maltosa y equilibrada', precio: 3300, categoriaId: b_cat_birras.id, localId: localBirreria.id, orden: 3 },
      // Tragos
      { nombre: 'Fernet con Coca', descripcion: 'El clásico argentino (70/30)', precio: 4500, categoriaId: b_cat_tragos.id, localId: localBirreria.id, orden: 1 },
      { nombre: 'Gin Tonic', descripcion: 'Beefeater, tónica, pepino', precio: 5000, categoriaId: b_cat_tragos.id, localId: localBirreria.id, orden: 2 },
    ]
  });

  console.log('🍺 Birrería configurada.');

  // =====================================================================
  // 5. DATOS PARA CAFÉ PARÍS
  // =====================================================================

  const c_sectorUnico = await prisma.sector.create({ data: { nombre: 'Salón', orden: 1, localId: localCafe.id } });

  await prisma.mesa.createMany({
    data: [
      { nombre: 'Mesa 1', qr_token: 'c_m1', sector: c_sectorUnico.nombre, localId: localCafe.id },
      { nombre: 'Mesa 2', qr_token: 'c_m2', sector: c_sectorUnico.nombre, localId: localCafe.id },
    ]
  });

  const c_cat_cafes = await prisma.categoria.create({ data: { nombre: 'Cafetería Especial', orden: 1, imprimirCocina: false, localId: localCafe.id } }); // Cafés a Barra
  const c_cat_pasteleria = await prisma.categoria.create({ data: { nombre: 'Pastelería', orden: 2, imprimirCocina: true, localId: localCafe.id } }); // Platos a Cocina

  await prisma.producto.createMany({
    data: [
      { nombre: 'Latte Macchiato', descripcion: 'Espresso con leche espumada', precio: 2800, categoriaId: c_cat_cafes.id, localId: localCafe.id },
      { nombre: 'Flat White', descripcion: 'Doble ristretto y poca leche', precio: 3000, categoriaId: c_cat_cafes.id, localId: localCafe.id },
      { nombre: 'Croissant', descripcion: 'De manteca, estilo francés', precio: 1500, categoriaId: c_cat_pasteleria.id, localId: localCafe.id },
      { nombre: 'Avocado Toast', descripcion: 'Pan de masa madre, palta, huevo poché', precio: 6500, categoriaId: c_cat_pasteleria.id, localId: localCafe.id },
    ]
  });

  console.log('☕ Café París configurado.');

  // =====================================================================
  // 6. DATOS PARA PIZZERÍA NAPOLI
  // =====================================================================

  const p_sector = await prisma.sector.create({ data: { nombre: 'Salón', orden: 1, localId: localPizzeria.id } });

  await prisma.mesa.createMany({
    data: [
      { nombre: 'Mesa 10', qr_token: 'p_m10', sector: p_sector.nombre, localId: localPizzeria.id },
      { nombre: 'Mesa 11', qr_token: 'p_m11', sector: p_sector.nombre, localId: localPizzeria.id },
    ]
  });

  const p_cat_pizzas = await prisma.categoria.create({ data: { nombre: 'Pizzas Napoletanas', orden: 1, imprimirCocina: true, localId: localPizzeria.id } });
  const p_cat_bebidas = await prisma.categoria.create({ data: { nombre: 'Bebidas', orden: 2, imprimirCocina: false, localId: localPizzeria.id } });

  await prisma.producto.createMany({
    data: [
      { nombre: 'Margherita', descripcion: 'Pomodoro, mozzarella fior di latte, albahaca', precio: 8000, categoriaId: p_cat_pizzas.id, localId: localPizzeria.id },
      { nombre: 'Diavola', descripcion: 'Con pepperoni picante', precio: 9500, categoriaId: p_cat_pizzas.id, localId: localPizzeria.id },
      { nombre: 'Agua con Gas', descripcion: '500ml', precio: 1500, categoriaId: p_cat_bebidas.id, localId: localPizzeria.id },
      { nombre: 'Coca Cola Zero', descripcion: 'Lata', precio: 1800, categoriaId: p_cat_bebidas.id, localId: localPizzeria.id },
    ]
  });

  console.log('🍕 Pizzería configurada.');

  console.log('🎉 SEED MAESTRO COMPLETADO EXITOSAMENTE');
  console.log('🔑 Credenciales:');
  console.log('   - Super Admin: superadmin@karta.com / 123');
  console.log('   - Birrería:    birreria@gmail.com / 123');
  console.log('   - Café:        cafe@gmail.com / 123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });