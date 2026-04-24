-- CreateEnum
CREATE TYPE "EstadoSesion" AS ENUM ('ACTIVA', 'CERRADA', 'MERGED');

-- AlterTable
ALTER TABLE "Mesa" ADD COLUMN     "sesionActivaId" INTEGER;

-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN     "estado" "EstadoSesion" NOT NULL DEFAULT 'ACTIVA';

-- CreateTable
CREATE TABLE "MergeMesaLog" (
    "id" SERIAL NOT NULL,
    "accion" TEXT NOT NULL,
    "mesaPrincipalId" INTEGER NOT NULL,
    "mesaUnidaId" INTEGER NOT NULL,
    "ejecutadoPor" INTEGER NOT NULL,
    "sesionId" INTEGER NOT NULL,
    "localId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MergeMesaLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MergeMesaLog_localId_creadoEn_idx" ON "MergeMesaLog"("localId", "creadoEn");

-- CreateIndex
CREATE INDEX "MergeMesaLog_sesionId_idx" ON "MergeMesaLog"("sesionId");

-- CreateIndex
CREATE INDEX "Sesion_localId_estado_idx" ON "Sesion"("localId", "estado");

-- AddForeignKey
ALTER TABLE "Mesa" ADD CONSTRAINT "Mesa_sesionActivaId_fkey" FOREIGN KEY ("sesionActivaId") REFERENCES "Sesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergeMesaLog" ADD CONSTRAINT "MergeMesaLog_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergeMesaLog" ADD CONSTRAINT "MergeMesaLog_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
