import { PrismaClient } from '@prisma/client'
import { subHours, subDays } from 'date-fns'

const prisma = new PrismaClient()

// Función auxiliar para elegir aleatorio
const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log('🌱 Iniciando Seed "Karta Analytics"...')

  // 1. LIMPIEZA PROFUNDA
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

  // ----------------------------------------------------
  // 2. CREACIÓN DE LOCAL "KARTA BAR" (Nuestro Demo Principal)
  // ----------------------------------------------------
  console.log('🍔 Creando Karta Bar...')
  
  const local1 = await prisma.local.create({
    data: { nombre: 'Karta Bar', slug: 'karta-bar', estado: 'ACTIVO' }
  })

  // Usuarios
  await prisma.usuario.createMany({
    data: [
      { email: 'admin@karta.com', password: '123', nombre: 'Dueño Karta', rol: 'ADMIN', localId: local1.id },
      { email: 'mozo1@karta.com', password: '123', nombre: 'Juan (Mozo)', rol: 'MOZO', localId: local1.id },
    ]
  })

  // Sectores y Mesas
  const sectorPatio = await prisma.sector.create({ data: { nombre: 'Patio', orden: 1, localId: local1.id } })
  const sectorSalon = await prisma.sector.create({ data: { nombre: 'Salón', orden: 2, localId: local1.id } })

  const mesas = await Promise.all([
    prisma.mesa.create({ data: { nombre: 'Mesa 1', sector: 'Patio', localId: local1.id } }),
    prisma.mesa.create({ data: { nombre: 'Mesa 2', sector: 'Patio', localId: local1.id } }),
    prisma.mesa.create({ data: { nombre: 'Mesa 3', sector: 'Salón', localId: local1.id } }),
    prisma.mesa.create({ data: { nombre: 'Mesa 4', sector: 'Salón', localId: local1.id } }),
    prisma.mesa.create({ data: { nombre: 'VIP 1', sector: 'Salón', localId: local1.id } }),
  ]);

  // Categorías y Productos
  const catBurgers = await prisma.categoria.create({ data: { nombre: 'Hamburguesas', orden: 1, imprimirCocina: true, localId: local1.id } })
  const catBebidas = await prisma.categoria.create({ data: { nombre: 'Bebidas', orden: 2, imprimirCocina: false, localId: local1.id } })
  const catEntradas = await prisma.categoria.create({ data: { nombre: 'Entradas', orden: 3, imprimirCocina: true, localId: local1.id } })

  const productos = await Promise.all([
    prisma.producto.create({ data: { nombre: 'Doble Bacon', precio: 9500, categoriaId: catBurgers.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: 'Royal Cheese', precio: 8500, categoriaId: catBurgers.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: 'Pinta IPA', precio: 4500, categoriaId: catBebidas.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: 'Coca Cola', precio: 3000, categoriaId: catBebidas.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: 'Papas Cheddar', precio: 6000, categoriaId: catEntradas.id, localId: local1.id } }),
    prisma.producto.create({ data: { nombre: 'Bastones Muzzarella', precio: 7000, categoriaId: catEntradas.id, localId: local1.id } }),
  ]);

  // ----------------------------------------------------
  // 3. GENERACIÓN DE HISTORIAL DE VENTAS (Métricas)
  // ----------------------------------------------------
  console.log('📈 Generando historial de ventas...')

  // Función para simular una venta completa
  const crearVentaSimulada = async (fechaBase: Date, mesa: any, cerrada: boolean = true) => {
    // Si es cerrada, dura entre 45 min y 2 horas
    const fechaFin = cerrada ? new Date(fechaBase.getTime() + randomNumber(45, 120) * 60000) : null;
    
    const sesion = await prisma.sesion.create({
      data: {
        mesaId: mesa.id,
        localId: local1.id,
        fechaInicio: fechaBase,
        fechaFin: fechaFin, // null si está abierta
        tokenEfimero: crypto.randomUUID(),
        nombreHost: "Cliente Simulado"
      }
    });

    // Creamos 1 o 2 pedidos por sesión
    let totalSesion = 0;
    const numPedidos = randomNumber(1, 3);

    for (let i = 0; i < numPedidos; i++) {
      const fechaPedido = new Date(fechaBase.getTime() + (i * 20 * 60000)); // Pedidos cada 20 min
      
      const pedido = await prisma.pedido.create({
        data: {
          sesionId: sesion.id,
          localId: local1.id,
          nombreCliente: "Cliente",
          estado: cerrada ? "ENTREGADO" : "PENDIENTE",
          fecha: fechaPedido
        }
      });

      // Agregamos items al pedido
      const numItems = randomNumber(1, 4);
      for (let j = 0; j < numItems; j++) {
        const prod = random(productos);
        const cantidad = randomNumber(1, 2);
        
        await prisma.itemPedido.create({
          data: {
            pedidoId: pedido.id,
            productoId: prod.id,
            cantidad: cantidad,
            precio: prod.precio,
            estado: cerrada ? "ENTREGADO" : "PENDIENTE"
          }
        });
        totalSesion += (prod.precio * cantidad);
      }
    }

    // Actualizamos el total de la sesión si está cerrada
    if (cerrada) {
      await prisma.sesion.update({
        where: { id: sesion.id },
        data: { totalVenta: totalSesion }
      });
    }
  };

  // A. VENTAS DE AYER (Para comparar crecimiento)
  // Generamos 15 ventas distribuidas ayer
  const ayer = subDays(new Date(), 1);
  for (let i = 0; i < 15; i++) {
    // Horas pico: 20hs a 23hs
    const hora = randomNumber(19, 23); 
    const fechaSimulada = new Date(ayer);
    fechaSimulada.setHours(hora, randomNumber(0, 59));
    await crearVentaSimulada(fechaSimulada, random(mesas));
  }

  // B. VENTAS DE HOY (CERRADAS)
  // Generamos 8 ventas que ya pagaron hoy (almuerzo o early dinner)
  const hoy = new Date();
  for (let i = 0; i < 8; i++) {
    const hora = randomNumber(12, 19); // Entre las 12 y las 19
    const fechaSimulada = new Date(hoy);
    fechaSimulada.setHours(hora, randomNumber(0, 59));
    await crearVentaSimulada(fechaSimulada, random(mesas));
  }

  // C. VENTAS ACTIVAS AHORA (Para ver el "En Vivo")
  console.log('🔥 Abriendo mesas en vivo...')
  // Abrimos 3 mesas AHORA MISMO
  const mesasActivas = [mesas[0], mesas[2], mesas[4]];
  for (const mesa of mesasActivas) {
    const haceUnRato = subHours(new Date(), 0); // Hace 0-1 hora
    await crearVentaSimulada(haceUnRato, mesa, false); // FALSE = NO CERRADA
  }

  // ========================================================
  // USUARIO SUPER ADMIN
  // ========================================================
  await prisma.usuario.create({
    data: {
      email: 'tomi@karta.app',
      password: '123',
      nombre: 'Tomas (Super Admin)',
      rol: 'SUPER_ADMIN',
      localId: null
    }
  })

  console.log('✅ SEED FINALIZADO CON ÉXITO')
  console.log('📊 Datos generados:')
  console.log('   - Local: Karta Bar')
  console.log('   - 15 Ventas ayer')
  console.log('   - 8 Ventas hoy (cerradas)')
  console.log('   - 3 Mesas abiertas AHORA MISMO (En vivo)')
  console.log('🔑 Login: admin@karta.com / 123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })