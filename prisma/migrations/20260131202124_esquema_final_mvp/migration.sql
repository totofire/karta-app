-- CreateTable
CREATE TABLE "Mesa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mesaId" INTEGER NOT NULL,
    "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" DATETIME,
    CONSTRAINT "Sesion_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" REAL NOT NULL,
    "imagen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "categoriaId" INTEGER NOT NULL,
    CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sesionId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedido_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" REAL NOT NULL,
    "observaciones" TEXT,
    CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ItemPedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_qr_token_key" ON "Mesa"("qr_token");
