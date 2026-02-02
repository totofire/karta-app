-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN "nombreCliente" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sesion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mesaId" INTEGER NOT NULL,
    "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" DATETIME,
    "totalVenta" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Sesion_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sesion" ("fechaFin", "fechaInicio", "id", "mesaId") SELECT "fechaFin", "fechaInicio", "id", "mesaId" FROM "Sesion";
DROP TABLE "Sesion";
ALTER TABLE "new_Sesion" RENAME TO "Sesion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
