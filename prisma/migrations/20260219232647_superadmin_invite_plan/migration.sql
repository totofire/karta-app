/*
  Warnings:

  - A unique constraint covering the columns `[inviteToken]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('DEMO', 'BASIC', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "Local" ADD COLUMN     "fechaVence" TIMESTAMP(3),
ADD COLUMN     "montoPlan" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'DEMO',
ADD COLUMN     "trialHasta" TIMESTAMP(3),
ALTER COLUMN "estado" SET DEFAULT 'DEMO';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "inviteExpira" TIMESTAMP(3),
ADD COLUMN     "inviteToken" TEXT,
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "activo" SET DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_inviteToken_key" ON "Usuario"("inviteToken");
