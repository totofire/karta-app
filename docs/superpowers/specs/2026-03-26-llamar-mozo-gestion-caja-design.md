# Spec: Llamar al mozo + Gestión de turnos/caja
**Fecha:** 2026-03-26
**Estado:** Aprobado

---

## Feature 1 — Llamar al mozo

### Problema
El cliente solo puede hacer pedidos desde el QR. No puede pedir servilletas, aderezos u otra atención sin llamar verbalmente al mozo.

### Solución
Botón "Llamar al mozo" en MenuInterface con motivos predefinidos. El llamado viaja por Realtime al panel del mozo, que lo descarta al atender.

### Modelo de datos

Campo nuevo en `Sesion`:
```prisma
llamadaMozo String? @default(null)
// Valores: "SERVILLETAS" | "ADEREZOS" | "CUBIERTOS" | "CONSULTA" | "OTRO"
```

Migración SQL:
```sql
ALTER TABLE "Sesion" ADD COLUMN "llamadaMozo" TEXT DEFAULT NULL;
```

### API

**`POST /api/pedidos/llamar`**
- Auth: ninguna (deriva sesión desde `tokenEfimero`)
- Body: `{ tokenEfimero: string, motivo: "SERVILLETAS" | "ADEREZOS" | "CUBIERTOS" | "CONSULTA" | "OTRO" }`
- Acción: `prisma.sesion.update({ where: { tokenEfimero }, data: { llamadaMozo: motivo } })`
- Guard: si `llamadaMozo` ya tiene valor, rechaza con 409 ("Ya hay un llamado activo")
- Response: `{ ok: true }`

**`DELETE /api/pedidos/llamar`**
- Auth: ADMIN o MOZO (cookie JWT)
- Body: `{ sesionId: number }`
- Acción: `prisma.sesion.update({ where: { id: sesionId, localId }, data: { llamadaMozo: null } })`
- Verifica ownership con `localId` del JWT
- Response: `{ ok: true }`

### Cliente — MenuInterface

- Floating button circular en esquina inferior izquierda (para no chocar con el carrito a la derecha): ícono `BellRing` con label "Llamar"
- Al tocar: bottom sheet con 5 botones de motivo (íconos + labels)
- Mientras `llamadaMozo !== null` en la sesión: el botón muestra "En camino…" deshabilitado. El cliente guarda el motivo en `localStorage` para persistir entre renders sin refetch.
- Toast de confirmación al enviar.

Motivos y labels:
| Valor | Label cliente | Ícono |
|-------|--------------|-------|
| SERVILLETAS | Servilletas | `Sparkles` |
| ADEREZOS | Aderezos / condimentos | `Salad` |
| CUBIERTOS | Cubiertos / utensilios | `Utensils` |
| CONSULTA | Tengo una consulta | `MessageCircle` |
| OTRO | Otro | `HelpCircle` |

### Mozo — MozoListener + panel

**MozoListener:** en el handler de `UPDATE Sesion`, detectar cuando `llamadaMozo` pasa de `null` a valor. Disparar:
- `audioManager.play("ding")`
- `notify.atencion("¡Te llaman!", mesaNombre + " — " + motivoLabel)`
- `notificarNativo(...)`
- `onUpdate()`

**Panel mozo (`app/mozo/page.tsx`):**
- Tarjeta de mesa: banda naranja encima de la amarilla (pide cuenta) cuando `llamadaMozo !== null`
- Contenido de la banda: ícono `BellRing` + label del motivo
- Botón "Atendido" en la banda → `DELETE /api/pedidos/llamar` → `mutate()`
- Badge en header: contador de llamados activos (similar al badge de `pidenCuenta`)

**`/api/mozo/mesas`:** incluir `llamadaMozo` en la respuesta de cada mesa ocupada.

---

## Feature 2 — Gestión de turnos/caja

### Problema
`cajaAbierta` en `Configuracion` es un toggle manual sin registro. No hay información de cuánto efectivo había al abrir, cuánto entró, retiros durante el servicio, ni historial de turnos.

### Solución
Modelo `Turno` con apertura/cierre formal. `cajaAbierta` se elimina como campo — la lógica pasa a derivarse de si existe un `Turno` activo. Los ingresos por método se calculan desde `Sesion` al momento del cierre.

### Modelo de datos

```prisma
model Turno {
  id              Int       @id @default(autoincrement())
  localId         Int
  local           Local     @relation(fields: [localId], references: [id])
  creadoPor       Int       // userId del admin que abrió
  fechaApertura   DateTime  @default(now())
  fechaCierre     DateTime?
  efectivoInicial Float     @default(0)
  efectivoFinal   Float?
  notas           String?
  retiros         Retiro[]
  @@index([localId, fechaCierre])
}

model Retiro {
  id          Int      @id @default(autoincrement())
  turnoId     Int
  turno       Turno    @relation(fields: [turnoId], references: [id])
  monto       Float
  descripcion String
  fecha       DateTime @default(now())
}
```

Relaciones en `Local`:
```prisma
turnos Turno[]
```

Migración SQL:
```sql
CREATE TABLE "Turno" (
  "id" SERIAL PRIMARY KEY,
  "localId" INTEGER NOT NULL REFERENCES "Local"("id"),
  "creadoPor" INTEGER NOT NULL,
  "fechaApertura" TIMESTAMP NOT NULL DEFAULT NOW(),
  "fechaCierre" TIMESTAMP,
  "efectivoInicial" FLOAT NOT NULL DEFAULT 0,
  "efectivoFinal" FLOAT,
  "notas" TEXT
);
CREATE INDEX ON "Turno"("localId", "fechaCierre");

CREATE TABLE "Retiro" (
  "id" SERIAL PRIMARY KEY,
  "turnoId" INTEGER NOT NULL REFERENCES "Turno"("id"),
  "monto" FLOAT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "fecha" TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE "Configuracion" DROP COLUMN "cajaAbierta";
```

### Lógica de "caja abierta"

Reemplazar toda referencia a `config.cajaAbierta` con:
```typescript
const turnoActivo = await prisma.turno.findFirst({
  where: { localId, fechaCierre: null },
});
const cajaAbierta = turnoActivo !== null;
```

Archivos afectados: `app/mesa/[token]/page.tsx`, `app/api/admin/servicio/route.ts` (si existe), y cualquier ruta que lea `cajaAbierta`.

### API

**`GET /api/admin/caja`**
- Retorna turno activo (con retiros) + últimos 10 turnos cerrados con totales calculados

**`POST /api/admin/caja/abrir`**
- Auth: ADMIN
- Body: `{ efectivoInicial: number, notas?: string }`
- Guard: rechaza 409 si ya hay turno activo
- Crea `Turno` con `creadoPor: userId`

**`POST /api/admin/caja/cerrar`**
- Auth: ADMIN
- Body: `{ efectivoFinal: number }`
- Guard: 404 si no hay turno activo
- Calcula ingresos agrupados por `metodoPago` desde `Sesion WHERE fechaFin BETWEEN turno.fechaApertura AND NOW()`
- Setea `fechaCierre = NOW()`, `efectivoFinal`
- Response incluye resumen completo del turno

**`POST /api/admin/caja/retiro`**
- Auth: ADMIN
- Body: `{ monto: number, descripcion: string }`
- Guard: 404 si no hay turno activo
- Crea `Retiro` en el turno activo

**`DELETE /api/admin/caja/retiro/[id]`**
- Auth: ADMIN
- Verifica ownership (retiro pertenece al turno del local)
- Elimina el retiro

### Admin UI — `/admin/caja`

**Estado: sin turno activo**
- Card centrado con formulario:
  - Input "Efectivo inicial en caja ($)"
  - Textarea "Notas" (opcional)
  - Botón "Abrir turno"

**Estado: turno activo**
- Card header: hora de apertura, efectivo inicial, badge "EN CURSO"
- Sección "Retiros durante el turno": lista de retiros con botón eliminar + formulario inline para agregar nuevo retiro (monto + descripción)
- Botón primario "Cerrar turno" → abre modal de cierre

**Modal de cierre:**
- Input "Efectivo contado en caja ($)"
- Resumen calculado (se fetch al abrir modal):
  - Ingresos efectivo (desde sesiones del turno)
  - Ingresos tarjeta
  - Ingresos QR
  - Total retiros
  - Diferencia de efectivo (efectivo inicial + ingresos efectivo - retiros - efectivo final)
- Botón "Confirmar cierre"

**Historial de turnos:** acordeón colapsable debajo, muestra los últimos 10 turnos con fecha, duración, totales por método.

### Sidebar admin

Reemplazar el toggle `cajaAbierta` actual en `app/admin/layout.tsx` por:
- Link "Caja" → `/admin/caja` con ícono `Vault`
- Badge verde "ABIERTA" o rojo "CERRADA" según turno activo

---

## Archivos a crear/modificar

### Feature 1
- `prisma/schema.prisma` — campo `llamadaMozo` en `Sesion`
- `app/api/pedidos/llamar/route.ts` — POST + DELETE
- `app/mesa/[token]/MenuInterface.tsx` — botón + bottom sheet
- `app/api/mozo/mesas/route.ts` — incluir `llamadaMozo`
- `components/MozoListener.tsx` — detectar llamado en UPDATE Sesion
- `app/mozo/page.tsx` — banda naranja + badge + botón atendido

### Feature 2
- `prisma/schema.prisma` — modelos `Turno` y `Retiro`, eliminar `cajaAbierta`
- `app/api/admin/caja/route.ts` — GET
- `app/api/admin/caja/abrir/route.ts` — POST
- `app/api/admin/caja/cerrar/route.ts` — POST
- `app/api/admin/caja/retiro/route.ts` — POST
- `app/api/admin/caja/retiro/[id]/route.ts` — DELETE
- `app/admin/caja/page.tsx` — UI completa
- `app/admin/layout.tsx` — reemplazar toggle por link con badge; el SWR de `/api/admin/servicio` pasa a `/api/admin/caja`
- `app/mesa/[token]/page.tsx` — reemplazar lectura de `cajaAbierta` por consulta de turno activo
- `app/api/admin/servicio/route.ts` — GET retorna `{ cajaAbierta }` derivado de turno activo; POST se elimina (ya no hay toggle)
- `app/api/admin/configuracion/route.ts` — eliminar lectura/escritura de `cajaAbierta`
