/*
  Warnings:

  - A unique constraint covering the columns `[tokenEfimero]` on the table `Sesion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN     "expiraEn" TIMESTAMP(3),
ADD COLUMN     "tokenEfimero" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_tokenEfimero_key" ON "Sesion"("tokenEfimero");
