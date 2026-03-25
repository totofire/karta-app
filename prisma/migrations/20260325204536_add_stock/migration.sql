-- AlterTable
ALTER TABLE "Configuracion" ADD COLUMN     "usaStock" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "stockActual" INTEGER;
