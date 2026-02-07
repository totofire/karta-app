import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando Seed Multi-Tenant...')

  // 1. Limpiar base de datos (Orden importante por las Foreign Keys)
  await prisma.itemPedido.deleteMany()
  await prisma.pedido.deleteMany()
  await prisma.sesion.deleteMany()
  await prisma.producto.deleteMany()
  await prisma.categoria.deleteMany()
  await prisma.mesa.deleteMany()
  await prisma.sector.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.local.deleteMany()

  console.log('🧹 DB Limpia.')

  // 2. Crear EL LOCAL (Fundamental)
  const local = await prisma.local.create({
    data: {
      nombre: 'Karta Bar Central',
      slug: 'karta-central',
      estado: 'ACTIVO'
    }
  })

  console.log(`🏢 Local creado: ${local.nombre} (ID: ${local.id})`)

  // 3. Crear Usuario Admin vinculado al Local
  await prisma.usuario.create({
    data: {
      email: 'birreria@gmail.com',
      password: '123', // En prod usar hash
      nombre: 'Admin Karta',
      rol: 'ADMIN', // Asegurate que coincida con tu Enum (ADMIN o SUPER_ADMIN)
      activo: true,
      localId: local.id
    }
  })

  console.log('👤 Usuario creado: birreria@gmail.com / 123')

  // 4. Crear Infraestructura (Sectores y Mesas)
  const sectorPatio = await prisma.sector.create({
    data: { nombre: 'Patio', orden: 1, localId: local.id }
  })

  const sectorSalon = await prisma.sector.create({
    data: { nombre: 'Salón', orden: 2, localId: local.id }
  })

  await prisma.mesa.createMany({
    data: [
      { nombre: 'Mesa 1', sector: 'Patio', localId: local.id, posX: 50, posY: 50 },
      { nombre: 'Mesa 2', sector: 'Patio', localId: local.id, posX: 150, posY: 50 },
      { nombre: 'Mesa 10', sector: 'Salón', localId: local.id, posX: 50, posY: 200 },
    ]
  })

  // 5. Crear Menú (Categorías y Productos)
  const catBebidas = await prisma.categoria.create({
    data: { nombre: 'Bebidas', orden: 1, imprimirCocina: false, localId: local.id }
  })

  const catComidas = await prisma.categoria.create({
    data: { nombre: 'Cocina', orden: 2, imprimirCocina: true, localId: local.id }
  })

  await prisma.producto.createMany({
    data: [
      { nombre: 'Cerveza Ipa', precio: 4500, categoriaId: catBebidas.id, localId: local.id },
      { nombre: 'Coca Cola', precio: 2500, categoriaId: catBebidas.id, localId: local.id },
      { nombre: 'Hamburguesa Completa', precio: 9500, categoriaId: catComidas.id, localId: local.id },
      { nombre: 'Papas Fritas', precio: 5000, categoriaId: catComidas.id, localId: local.id },
    ]
  })

  console.log('✅ SEED FINALIZADO EXITOSAMENTE')
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })