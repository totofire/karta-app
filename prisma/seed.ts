import { PrismaClient } from '@prisma/client'

import { prisma } from "@/lib/prisma"

async function main() {
  // Limpiar datos existentes (opcional)
  await prisma.itemPedido.deleteMany()
  await prisma.pedido.deleteMany()
  await prisma.sesion.deleteMany()
  await prisma.mesa.deleteMany()
  await prisma.producto.deleteMany()
  await prisma.categoria.deleteMany()
  await prisma.usuario.deleteMany()

  // Crear categorías
  const cervezas = await prisma.categoria.create({
    data: {
      nombre: 'Cervezas',
      orden: 0,
    },
  })

  const hamburguesas = await prisma.categoria.create({
    data: {
      nombre: 'Hamburguesas',
      orden: 1,
    },
  })

  const bebidas = await prisma.categoria.create({
    data: {
      nombre: 'Bebidas sin Alcohol',
      orden: 2,
    },
  })

  // Crear productos - Cervezas
  await prisma.producto.createMany({
    data: [
      {
        nombre: 'Liso Santa Fe',
        descripcion: 'Cerveza artesanal bien helada',
        precio: 1500,
        categoriaId: cervezas.id,
        activo: true,
        orden: 0,
      },
      {
        nombre: 'IPA',
        descripcion: 'India Pale Ale aromática',
        precio: 1800,
        categoriaId: cervezas.id,
        activo: true,
        orden: 1,
      },
      {
        nombre: 'Porter',
        descripcion: 'Cerveza negra cremosa',
        precio: 1700,
        categoriaId: cervezas.id,
        activo: true,
        orden: 2,
      },
    ],
  })

  // Crear productos - Hamburguesas
  await prisma.producto.createMany({
    data: [
      {
        nombre: 'Hamburguesa Clásica',
        descripcion: 'Carne, lechuga, tomate, cebolla',
        precio: 3500,
        categoriaId: hamburguesas.id,
        activo: true,
        orden: 0,
      },
      {
        nombre: 'Hamburguesa Completa',
        descripcion: 'Carne, queso, bacon, huevo, verduras',
        precio: 4500,
        categoriaId: hamburguesas.id,
        activo: true,
        orden: 1,
      },
      {
        nombre: 'Hamburguesa Veggie',
        descripcion: 'Hamburguesa de lentejas con verduras',
        precio: 3200,
        categoriaId: hamburguesas.id,
        activo: true,
        orden: 2,
      },
    ],
  })

  // Crear productos - Bebidas
  await prisma.producto.createMany({
    data: [
      {
        nombre: 'Coca Cola',
        descripcion: '500ml',
        precio: 800,
        categoriaId: bebidas.id,
        activo: true,
        orden: 0,
      },
      {
        nombre: 'Agua Mineral',
        descripcion: '500ml',
        precio: 500,
        categoriaId: bebidas.id,
        activo: true,
        orden: 1,
      },
    ],
  })

  // Crear usuario admin
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@karta.com' },
    update: {},
    create: {
      nombre: 'Dueño',
      email: 'admin@karta.com',
      password: '123', // Contraseña maestra
      rol: 'ADMIN'
    },
  })
  
  console.log('👤 Usuario Admin creado:', admin.email)

  // Crear mesas
  await prisma.mesa.createMany({
    data: [
      { nombre: 'Mesa 1', qr_token: 'm1-interior' },
      { nombre: 'Mesa 2', qr_token: 'm2-interior' },
      { nombre: 'Mesa 3', qr_token: 'm3-interior' },
      { nombre: 'Mesa 4', qr_token: 'm4-patio' },
      { nombre: 'Mesa 5', qr_token: 'm5-patio' },
      { nombre: 'Barra 1', qr_token: 'b1-barra' },
    ],
  })

  console.log('✅ Seed completado con éxito')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })