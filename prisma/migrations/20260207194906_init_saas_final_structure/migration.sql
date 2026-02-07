-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MOZO');

-- CreateEnum
CREATE TYPE "EstadoLocal" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'BAJA', 'DEMO');

-- CreateTable
CREATE TABLE "Local" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "slug" TEXT,
    "estado" "EstadoLocal" NOT NULL DEFAULT 'ACTIVO',
    "notasAdmin" TEXT,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'ADMIN',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "localId" INTEGER,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" SERIAL NOT NULL,
    "horaApertura" TEXT NOT NULL DEFAULT '08:00',
    "horaCierre" TEXT NOT NULL DEFAULT '00:00',
    "cajaAbierta" BOOLEAN NOT NULL DEFAULT true,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mesa" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "sector" TEXT NOT NULL DEFAULT 'General',
    "posX" INTEGER NOT NULL DEFAULT 0,
    "posY" INTEGER NOT NULL DEFAULT 0,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "imprimirCocina" BOOLEAN NOT NULL DEFAULT true,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "imagen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "categoriaId" INTEGER NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" SERIAL NOT NULL,
    "mesaId" INTEGER NOT NULL,
    "localId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "totalVenta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nombreHost" TEXT,
    "tokenEfimero" TEXT,
    "expiraEn" TIMESTAMP(3),
    "solicitaCuenta" TIMESTAMP(3),

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "sesionId" INTEGER NOT NULL,
    "localId" INTEGER NOT NULL,
    "nombreCliente" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impreso" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" SERIAL NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "pedidoId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Local_slug_key" ON "Local"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_localId_idx" ON "Usuario"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_localId_key" ON "Configuracion"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_localId_nombre_key" ON "Sector"("localId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_qr_token_key" ON "Mesa"("qr_token");

-- CreateIndex
CREATE INDEX "Mesa_localId_activo_idx" ON "Mesa"("localId", "activo");

-- CreateIndex
CREATE INDEX "Categoria_localId_orden_idx" ON "Categoria"("localId", "orden");

-- CreateIndex
CREATE INDEX "Producto_localId_categoriaId_activo_idx" ON "Producto"("localId", "categoriaId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_tokenEfimero_key" ON "Sesion"("tokenEfimero");

-- CreateIndex
CREATE INDEX "Sesion_localId_fechaFin_idx" ON "Sesion"("localId", "fechaFin");

-- CreateIndex
CREATE INDEX "Sesion_mesaId_fechaFin_idx" ON "Sesion"("mesaId", "fechaFin");

-- CreateIndex
CREATE INDEX "Pedido_localId_estado_idx" ON "Pedido"("localId", "estado");

-- CreateIndex
CREATE INDEX "Pedido_sesionId_idx" ON "Pedido"("sesionId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuracion" ADD CONSTRAINT "Configuracion_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesa" ADD CONSTRAINT "Mesa_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
