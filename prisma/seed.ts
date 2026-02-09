import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando Seed Multi-Tenant Potente...')

  // --------------------------------------------------------
  // 1. LIMPIEZA TOTAL (Orden estricto por Foreign Keys)
  // --------------------------------------------------------
  await prisma.itemPedido.deleteMany()
  await prisma.pedido.deleteMany()
  await prisma.sesion.deleteMany()
  await prisma.producto.deleteMany()
  await prisma.categoria.deleteMany()
  await prisma.mesa.deleteMany()
  await prisma.sector.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.local.deleteMany()

  console.log('🧹 Base de datos limpia.')

  // ========================================================
  // LOCAL 1: KARTA BAR (Cervecería/Hamburguesería)
  // ========================================================
  console.log('🍔 Creando Local 1: Karta Bar...')
  
  const local1 = await prisma.local.create({
    data: { nombre: 'Karta Bar', slug: 'karta-bar', estado: 'ACTIVO' }
  })

  // Usuarios Local 1
  await prisma.usuario.createMany({
    data: [
      { 
        email: 'admin@karta.com', 
        password: '123', 
        nombre: 'Dueño Karta', 
        rol: 'ADMIN', 
        localId: local1.id 
      },
      { 
        email: 'mozo1@karta.com', 
        password: '123', 
        nombre: 'Juan (Mozo Patio)', 
        rol: 'MOZO', 
        localId: local1.id 
      },
    
    ]
  })

  // Sectores Local 1
  const l1_sectorPatio = await prisma.sector.create({ data: { nombre: 'Patio Cervecero', orden: 1, localId: local1.id } })
  const l1_sectorSalon = await prisma.sector.create({ data: { nombre: 'Salón Principal', orden: 2, localId: local1.id } })

  // Mesas Local 1
  await prisma.mesa.createMany({
    data: [
      { nombre: 'Mesa 1', sector: 'Patio Cervecero', localId: local1.id, activo: true },
      { nombre: 'Mesa 2', sector: 'Patio Cervecero', localId: local1.id, activo: true },
      { nombre: 'Mesa 3', sector: 'Patio Cervecero', localId: local1.id, activo: true },
      { nombre: 'Mesa VIP', sector: 'Salón Principal', localId: local1.id, activo: true },
    ]
  })

  // Categorías y Productos Local 1
  const l1_catBurgers = await prisma.categoria.create({ data: { nombre: 'Hamburguesas', orden: 1, imprimirCocina: true, localId: local1.id } })
  const l1_catBirras = await prisma.categoria.create({ data: { nombre: 'Cervezas', orden: 2, imprimirCocina: false, localId: local1.id } })

  await prisma.producto.createMany({
    data: [
      { nombre: 'Doble Bacon', precio: 9500, categoriaId: l1_catBurgers.id, localId: local1.id, descripcion: 'Doble carne, doble cheddar, panceta.' },
      { nombre: 'Royal Cheese', precio: 8500, categoriaId: l1_catBurgers.id, localId: local1.id },
      { nombre: 'Pinta IPA', precio: 4500, categoriaId: l1_catBirras.id, localId: local1.id },
      { nombre: 'Pinta Honey', precio: 4500, categoriaId: l1_catBirras.id, localId: local1.id },
    ]
  })


  // ========================================================
  // LOCAL 2: CAFÉ CENTRAL (Cafetería)
  // ========================================================
  console.log('☕ Creando Local 2: Café Central...')

  const local2 = await prisma.local.create({
    data: { nombre: 'Café Central', slug: 'cafe-central', estado: 'ACTIVO' }
  })

  // Usuarios Local 2
  await prisma.usuario.createMany({
    data: [
      { 
        email: 'admin@cafe.com', 
        password: '123', 
        nombre: 'Dueña Café', 
        rol: 'ADMIN', 
        localId: local2.id 
      },
      { 
        email: 'mozo@cafe.com', 
        password: '123', 
        nombre: 'Sofía (Moza)', 
        rol: 'MOZO', 
        localId: local2.id 
      }
    ]
  })

  // Sectores Local 2
  const l2_sectorVereda = await prisma.sector.create({ data: { nombre: 'Vereda al Sol', orden: 1, localId: local2.id } })
  const l2_sectorAdentro = await prisma.sector.create({ data: { nombre: 'Adentro', orden: 2, localId: local2.id } })

  // Mesas Local 2
  await prisma.mesa.createMany({
    data: [
      { nombre: 'Mesa A1', sector: 'Vereda al Sol', localId: local2.id, activo: true },
      { nombre: 'Mesa A2', sector: 'Vereda al Sol', localId: local2.id, activo: true },
      { nombre: 'Barra 1', sector: 'Adentro', localId: local2.id, activo: true },
    ]
  })

  // Categorías y Productos Local 2
  const l2_catCafeteria = await prisma.categoria.create({ data: { nombre: 'Cafetería', orden: 1, imprimirCocina: true, localId: local2.id } })
  const l2_catPanaderia = await prisma.categoria.create({ data: { nombre: 'Panadería', orden: 2, imprimirCocina: true, localId: local2.id } })

  await prisma.producto.createMany({
    data: [
      { nombre: 'Café con Leche', precio: 3500, categoriaId: l2_catCafeteria.id, localId: local2.id },
      { nombre: 'Latte', precio: 3800, categoriaId: l2_catCafeteria.id, localId: local2.id },
      { nombre: 'Medialuna', precio: 900, categoriaId: l2_catPanaderia.id, localId: local2.id },
      { nombre: 'Tostado Mixto', precio: 5000, categoriaId: l2_catPanaderia.id, localId: local2.id },
    ]
  })

  // ========================================================
  // USUARIO SUPER ADMIN (Sin local, o local null)
  // ========================================================
  console.log('👑 Creando Super Admin...')
  
  await prisma.usuario.create({
    data: {
      email: 'tomi@karta.app', // TU USUARIO
      password: '123',
      nombre: 'Tomas (Super Admin)',
      rol: 'SUPER_ADMIN',
      localId: null // No pertenece a ningún local específico
    }
  })

  console.log('✅ SEED MULTI-TENANT FINALIZADO')
  console.log('------------------------------------------------')
  console.log('🔐 Credenciales de prueba:')
  console.log('🍔 KARTA BAR   -> admin@karta.com / 123 (Dueño)')
  console.log('               -> mozo1@karta.com / 123 (Mozo)')
  console.log('☕ CAFE CENTRAL-> admin@cafe.com  / 123 (Dueño)')
  console.log('               -> mozo@cafe.com   / 123 (Mozo)')
  console.log('👑 SUPER ADMIN -> tomi@karta.app  / 123')
  console.log('------------------------------------------------')
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })