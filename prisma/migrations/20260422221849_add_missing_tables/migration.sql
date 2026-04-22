/*
  Warnings:

  - You are about to drop the column `cajaAbierta` on the `Configuracion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Configuracion" DROP COLUMN "cajaAbierta";

-- AlterTable
ALTER TABLE "ItemPedido" ADD COLUMN     "descuentoAplicado" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN     "descuentoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "llamadaMozo" TEXT;

-- CreateTable
CREATE TABLE "ReglaDescuento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categoriaId" INTEGER,
    "productoId" INTEGER,
    "diasSemana" TEXT,
    "horaDesde" TEXT,
    "horaHasta" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "ReglaDescuento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" SERIAL NOT NULL,
    "localId" INTEGER NOT NULL,
    "creadoPor" INTEGER NOT NULL,
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "efectivoInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "efectivoFinal" DOUBLE PRECISION,
    "notas" TEXT,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retiro" (
    "id" SERIAL NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "personas" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "mesaId" INTEGER,
    "localId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReglaDescuento_localId_activo_idx" ON "ReglaDescuento"("localId", "activo");

-- CreateIndex
CREATE INDEX "Turno_localId_fechaCierre_idx" ON "Turno"("localId", "fechaCierre");

-- CreateIndex
CREATE INDEX "Reserva_localId_fecha_idx" ON "Reserva"("localId", "fecha");

-- AddForeignKey
ALTER TABLE "ReglaDescuento" ADD CONSTRAINT "ReglaDescuento_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retiro" ADD CONSTRAINT "Retiro_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
