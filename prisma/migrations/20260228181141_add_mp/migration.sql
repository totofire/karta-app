-- AlterTable
ALTER TABLE "Local" ADD COLUMN     "mpAccessToken" TEXT,
ADD COLUMN     "mpConectadoEn" TIMESTAMP(3),
ADD COLUMN     "mpEmail" TEXT,
ADD COLUMN     "mpRefreshToken" TEXT,
ADD COLUMN     "mpUserId" TEXT;

-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN     "mpPaymentId" TEXT,
ADD COLUMN     "mpPreferenceId" TEXT,
ADD COLUMN     "pagadoEn" TIMESTAMP(3);
