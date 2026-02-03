// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpiar datos existentes
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.sesion.deleteMany();
  await prisma.mesa.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.sector.deleteMany();

  // Crear sectores
  const sectorInterior = await prisma.sector.create({
    data: { nombre: 'Interior', orden: 1 }
  });
  
  const sectorPatio = await prisma.sector.create({
    data: { nombre: 'Patio', orden: 2 }
  });

  const sectorBarra = await prisma.sector.create({
    data: { nombre: 'Barra', orden: 3 }
  });

  console.log('✅ Sectores creados');

  // Crear categorías
  const cervezas = await prisma.categoria.create({
    data: { nombre: 'Cervezas', orden: 1, imprimirCocina: false }
  });

  const hamburguesas = await prisma.categoria.create({
    data: { nombre: 'Hamburguesas', orden: 2, imprimirCocina: true }
  });

  const bebidas = await prisma.categoria.create({
    data: { nombre: 'Bebidas sin Alcohol', orden: 3, imprimirCocina: false }
  });

  console.log('✅ Categorías creadas');

  // Crear productos - Cervezas
  await prisma.producto.createMany({
    data: [
      {
        nombre: 'Liso Santa Fe',
        descripcion: 'Cerveza artesanal bien helada',
        precio: 1500,
        categoriaId: cervezas.id,
        activo: true,
        orden: 1,
      },
      {
        nombre: 'IPA',
        descripcion: 'India Pale Ale aromática',
        precio: 1800,
        categoriaId: cervezas.id,
        activo: true,
        orden: 2,
      },
      {
        nombre: 'Porter',
        descripcion: 'Cerveza negra cremosa',
        precio: 1700,
        categoriaId: cervezas.id,
        activo: true,
        orden: 3,
      },
    ],
  });

  // Crear productos - Hamburguesas
  await prisma.producto.createMany({
    data: [
      {
        nombre: 'Hamburguesa Clásica',
        descripcion: 'Carne, lechuga, tomate, cebolla',
        precio: 3500,
        categoriaId: hamburguesas.id,
        activo: true,
        orden: 1,
      },
      {
        nombre: 'Hamburguesa Completa',
        descripcion: 'Carne, queso, bacon, huevo, verduras',
        precio: 4500,
        categoriaId: hamburguesas.id,
        activo: true,
        orden: 2,
      },
      {
        nombre: 'Hamburguesa Veggie',
        descripcion: 'Hamburguesa de lentejas con verduras',
        precio: 3200,
        categoriaId: hamburguesas.id,
        activo: true,
        orden: 3,
      },
    ],
  });

  // Crear productos - Bebidas
  await prisma.producto.createMany({
    data: [
      {
        nombre: 'Coca Cola',
        descripcion: '500ml',
        precio: 800,
        categoriaId: bebidas.id,
        activo: true,
        orden: 1,
      },
      {
        nombre: 'Agua Mineral',
        descripcion: '500ml',
        precio: 500,
        categoriaId: bebidas.id,
        activo: true,
        orden: 2,
      },
    ],
  });

  console.log('✅ Productos creados');

  // Crear usuario admin
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@karta.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@karta.com',
      password: '123',
      rol: 'ADMIN'
    },
  });
  
  console.log('✅ Usuario admin creado:', admin.email);

  // Crear mesas
  await prisma.mesa.createMany({
    data: [
      { nombre: 'Mesa 1', qr_token: 'm1', sector: sectorInterior.nombre },
      { nombre: 'Mesa 2', qr_token: 'm2', sector: sectorInterior.nombre },
      { nombre: 'Mesa 3', qr_token: 'm3', sector: sectorInterior.nombre },
      { nombre: 'Mesa 4', qr_token: 'm4', sector: sectorPatio.nombre },
      { nombre: 'Mesa 5', qr_token: 'm5', sector: sectorPatio.nombre },
      { nombre: 'Barra 1', qr_token: 'b1', sector: sectorBarra.nombre },
    ],
  });

  console.log('✅ Mesas creadas');
  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });