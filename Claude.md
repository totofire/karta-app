# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE.md — Karta SaaS Platform

## Comandos

```bash
npm run dev          # Servidor de desarrollo (Next.js 15)
npm run build        # prisma migrate deploy + next build
npm run lint         # ESLint

npx prisma migrate dev --name <nombre>   # Crear y aplicar nueva migración local
npx prisma migrate deploy                # Aplicar migraciones pendientes (prod)
npx prisma studio                        # GUI para explorar la base de datos
npx prisma generate                      # Regenerar Prisma Client tras cambios de schema
```

## Rol

Desarrollador Full-Stack Senior trabajando en Karta, plataforma SaaS multi-tenant para restaurantes/bares en Argentina. Codebase 100% en español. Código tipado, modular, cero polling. Respuestas en código listo para producción.

## Stack Obligatorio

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, Server Components default) |
| Lenguaje | TypeScript (tipado estricto) |
| ORM / DB | Prisma + PostgreSQL (Supabase) |
| Estilos | Tailwind CSS + Lucide React (íconos) |
| Gráficos | Recharts |
| Notificaciones | react-hot-toast |
| Tiempo Real | Supabase Realtime (WebSockets, `postgres_changes`) |
| Caché | SWR (`revalidateOnFocus: true`, `refreshInterval` NUNCA) |
| Auth | Cookie-based JWT via `@/lib/auth` (`getLocalId()`, `getSuperAdmin()`, `getSession()`) |
| Validación | Zod (ver `/api/admin/productos/route.ts`) |
| Deploy | Vercel |

## Arquitectura Multi-Tenant (Regla de Oro)

**TODA consulta Prisma en rutas ADMIN/MOZO DEBE filtrar por `localId`.** Sin excepción.
Las rutas de CLIENTE derivan `localId` de la mesa/sesión, no de cookie.

```typescript
// ✅ Ruta ADMIN — localId desde cookie
export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const mesas = await prisma.mesa.findMany({ where: { localId, activo: true } });
  return NextResponse.json(mesas);
}

// ✅ Ruta CLIENTE — localId desde la mesa (no cookie)
const sesion = await prisma.sesion.findUnique({ where: { tokenEfimero }, include: { mesa: true } });
const localIdDelBar = sesion.mesa.localId;

// ❌ NUNCA — filtra datos entre tenants
const mesas = await prisma.mesa.findMany();
```

Auth helpers (`@/lib/auth`):
- `getSession()` → retorna `{ userId, localId, rol }` desde JWT en cookie
- `getLocalId()` → shortcut: `getSession().localId`
- `getSuperAdmin()` → valida `rol === "SUPER_ADMIN"`, retorna session o null

RLS de Supabase: solo aplica a `anon key` (SELECT). Prisma bypasea RLS via `DATABASE_URL`. Filtrar SIEMPRE por `localId` en Prisma.

## Route Handlers — Next.js 15

`params` es `Promise`. Siempre `await`.

```typescript
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // verificar ownership antes de mutar
  const existe = await prisma.producto.findFirst({ where: { id: Number(id), localId } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  // ...
}
```

Clientes externos: inicialización lazy DENTRO del handler, nunca a nivel módulo.
Todas las rutas dinámicas llevan `export const dynamic = "force-dynamic";` cuando usan cookies/auth.

## Tiempo Real — Patrón Estándar

Componentes Listener (`"use client"`) suscritos a Supabase Realtime. Al recibir evento → `mutate()` de SWR o `router.refresh()`.

```typescript
// Patrón: Listener component (ej: KDSListener, ClienteListener, MesasListener)
"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function MesasListener({ localId, onUpdate }: { localId: number; onUpdate: () => void }) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (!localId) return;
    const canal = supabase
      .channel(`mesas-listener-${localId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "Sesion", filter: `localId=eq.${localId}` },
        () => onUpdateRef.current()
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [localId]);
  return null;
}
```

**Listeners existentes y su responsabilidad:**
- `KDSListener` → Cocina/Barra: detecta cancelaciones totales/parciales en tabla `Pedido`
- `ClienteListener` → Cliente: escucha cambios de estado en sus pedidos (CANCELADO, ENTREGADO)
- `MesasListener` → Mozo: escucha cambios en `Mesa` y `Sesion`
- `MozoListener` → Mozo: escucha `llamadaMozo` en tabla `sesion` para alertas de llamadas al mozo
- `ServicioListener` → Cliente: escucha cambios en `Configuracion` (cajaAbierta)
- Layout Admin (`app/admin/layout.tsx`) → canal `admin-pedidos-{localId}` + `admin-sesiones-{localId}`

**Audio en background tabs:** Chrome throttlea fetch/SWR pero NUNCA WebSockets. Notificaciones nativas del OS desde callback WS (`notificarNativo` de `lib/webNotify.ts`). Audio/toasts in-app desde `useEffect` de SWR diff. `AudioManager` (`lib/audio.ts`) pre-warm con `sessionStorage` para sobrevivir `router.refresh()`.

## Convenciones de Nomenclatura

| Concepto | Código | Tabla Prisma |
|---|---|---|
| Restaurante/Bar | `local`, `localId` | `Local` |
| Mesa | `mesa`, `mesaId` | `Mesa` |
| Pedido | `pedido` | `Pedido` |
| Ítem de pedido | `itemPedido` | `ItemPedido` |
| Sesión cliente | `sesion`, `tokenEfimero` | `Sesion` |
| Empleado | `mozo` | `Usuario` (rol=MOZO) |
| Estado del pedido | `estado` | `String` (PENDIENTE, EN_PREPARACION, ENTREGADO, CANCELADO) |
| Flag de impresión | `impreso` | `Boolean` en `Pedido` |
| Categoría | `categoria` | `Categoria` |
| Sector/Zona | `sector` | `Sector` + campo `sector` en `Mesa` |
| Configuración | `configuracion` | `Configuracion` |
| Llamada al mozo | `llamadaMozo` | `String?` en `Sesion` ("SERVILLETAS" \| "ADEREZOS" \| "CUBIERTOS" \| "CONSULTA" \| "OTRO") |
| Turno de caja | `turno` | `Turno` |
| Retiro de caja | `retiro` | `Retiro` |
| Reserva | `reserva` | `Reserva` |
| Regla de descuento | `reglaDescuento` | `ReglaDescuento` |

Todo el codebase usa nombres en español. Mantener consistencia absoluta.

## Patrones de Código

```typescript
// Tokens
import { randomBytes } from "crypto";
const token = randomBytes(32).toString("hex");

// Passwords
import bcrypt from "bcryptjs";
await bcrypt.hash(password, 10);

// Slugs con dedup
let slug = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const slugExiste = await prisma.local.findUnique({ where: { slug } });
if (slugExiste) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

// Transacciones Prisma
await prisma.$transaction([
  prisma.usuario.updateMany({ where: { localId }, data: { activo: false } }),
  prisma.local.update({ where: { id: localId }, data: { estado: "BAJA" } }),
]);

// URLs absolutas
const url = `${process.env.NEXT_PUBLIC_APP_URL}/activar-cuenta?token=${inviteToken}`;

// Recharts formatters — usar `any` controlado, castear dentro
const formatter = (v: any) => `$${Number(v).toLocaleString("es-AR")}`;

// Verificar ownership antes de mutar (patrón estándar)
const existe = await prisma.categoria.findFirst({ where: { id: Number(id), localId } });
if (!existe) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

// Raw SQL en analytics (DATE_TRUNC, aggregations)
const rows = await prisma.$queryRaw<{ periodo: Date; total: number }[]>`
  SELECT DATE_TRUNC(${groupFormat}, "fechaFin") AS periodo, SUM("totalVenta")::float AS total
  FROM "Sesion" WHERE "localId" = ${localId} AND "fechaFin" >= ${startDate}
  GROUP BY periodo ORDER BY periodo ASC
`;

// SWR — NUNCA refreshInterval
const { data, mutate } = useSWR("/api/admin/estado", fetcher, {
  revalidateOnFocus: true, fallbackData: [],
});

// Supabase singleton (HMR-safe en dev)
declare global { var __supabaseClient: SupabaseClient | undefined; }
```

## Roles y Flujos

| Rol | Ruta base | Auth | Función |
|---|---|---|---|
| `SUPER_ADMIN` | `/superadmin/dashboard` | `getSuperAdmin()` | Onboarding locales, estados, métricas globales |
| `ADMIN` | `/admin` | `getLocalId()` | Analytics, carta, mesas, equipo, KDS, config |
| `MOZO` | `/mozo` | `getLocalId()` | Toma de pedidos, gestión de mesas en tiempo real |
| `CLIENTE` | `/mesa/[token]` | `tokenEfimero` | QR → Sesion → Pedido (anónimo, sin login) |

**Flujo cliente:** QR físico (`mesa.qr_token`) → `/mesa/[token]` → Server Component busca mesa → crea `Sesion` con `tokenEfimero` → redirect a `/mesa/[tokenEfimero]` → `MenuInterface` (client component).

**Flujo onboarding:** SuperAdmin crea local (4 campos) → ACTIVO/BASIC inmediato → genera `inviteToken` (48hs) → envía link por WhatsApp → Admin activa cuenta en `/activar-cuenta?token=xxx`.

**Flujo cobro:** Cliente selecciona método de pago (QR/Tarjeta/Efectivo) → `POST /api/pedidos/cuenta` setea `solicitaCuenta` + `metodoPago` en Sesion → Realtime notifica al admin/mozo → admin cierra mesa via `/api/admin/cerrar`.

## KDS (Cocina y Barra)

Páginas: `/admin/cocina`, `/admin/barra`. Comparten `KDSListener` component.

**Separación cocina/barra:** Campo `imprimirCocina` en `Categoria`. Items con `imprimirCocina: true` → cocina, `false` → barra.

**Despacho (`/api/admin/despachar`):** Marca items del sector como ENTREGADO. Si quedan items del otro sector → `EN_PREPARACION`. Si 0 pendientes → `ENTREGADO` + `fechaDespacho = new Date()`.

**Cierre de mesa (`/api/admin/cerrar`):** Transacción que calcula totalVenta, pasa todo a ENTREGADO, setea `fechaFin`, libera mesa.

**Eventos Realtime (KDSListener):**
- Cancelación total: `estado` → `CANCELADO` → toast rojo
- Cancelación parcial: `impreso` flipa `true→false` en PENDIENTE → toast ámbar
- Ref `canceladosPorAdmin`: Set que evita auto-notificación

## Analytics Dashboard

7 tabs en `/admin/analytics`. API: `/api/admin/analytics?mode=xxx&range=xxx`.

Modes: `ventas_periodo`, `top_productos`, `ticket_sesiones`, `rendimiento_mesas`, `rotacion_mesas`, `velocidad_servicio`, `tiempo_espera`.

**Reglas:**
- Datos duros únicamente. **CERO insights automáticos.**
- Mobile tab bar: `grid grid-cols-4 md:flex`
- Raw SQL (`$queryRaw`) para aggregations — rellenar huecos en backend
- Comparación con período anterior incluida en `ventas_periodo`

## Modelo de Datos (resumen)

```
Local (1) ──→ (N) Usuario, Mesa, Sector, Categoria, Producto, Sesion, Pedido, Configuracion(1:1)
Local (1) ──→ (N) ReglaDescuento, Reserva, Turno
Mesa (1) ──→ (N) Sesion, Reserva
Sesion (1) ──→ (N) Pedido     [tokenEfimero unique, solicitaCuenta, metodoPago, llamadaMozo]
Pedido (1) ──→ (N) ItemPedido [estado, impreso, fechaDespacho]
Categoria (1) ──→ (N) Producto [imprimirCocina determina cocina vs barra]
Turno (1) ──→ (N) Retiro      [fechaApertura, fechaCierre, efectivoInicial, efectivoFinal]
```

Campos clave no obvios: `Configuracion.mapaZonas` (Json — layout editor de salón), `Mesa.numero` (correlativo auto), `Mesa.posX/posY` (mapa), `Local.mpAccessToken` (Mercado Pago OAuth).

## Módulos Adicionales

**Caja (`/admin/caja`):** Gestión de turnos de caja. Un turno activo = caja abierta (`Turno` sin `fechaCierre`). Flujo: abrir turno (`POST /api/admin/caja/abrir`) → registrar retiros (`POST /api/admin/caja/retiro`) → cerrar (`POST /api/admin/caja/cerrar`). Estado actual via `GET /api/admin/caja`.

**Reservas (`/admin/reservas`):** CRUD de reservas (`Reserva`). Estados: `PENDIENTE` | `CONFIRMADA` | `CANCELADA` | `COMPLETADA`. API en `/api/admin/reservas` y `/api/admin/reservas/[id]`.

**Descuentos (`/admin/descuentos`):** Reglas de descuento configurables (`ReglaDescuento`). Tipos: `PORCENTAJE` | `2X1` | `PRECIO_ESPECIAL` | `DESCUENTO_GLOBAL`. Scope opcional por categoría o producto. Condiciones temporales por `diasSemana`/`horaDesde`/`horaHasta`. Lógica de aplicación en `lib/descuentos.ts` y `lib/descuentos-utils.ts`.

**Llamar al mozo:** Cliente llama al mozo desde `MenuInterface` → `POST /api/pedidos/llamar` setea `llamadaMozo` en Sesion → `MozoListener` en `/mozo` detecta el cambio via Realtime → alerta visual/sonora al mozo.

## Variables de Entorno

```
DATABASE_URL=                    # Prisma (bypasea RLS)
DIRECT_URL=                      # Prisma direct connection
NEXT_PUBLIC_SUPABASE_URL=        # Cliente Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Anon key (RLS aplica)
NEXT_PUBLIC_APP_URL=             # URL base para links absolutos
JWT_SECRET=                      # Secret para JWT auth
MP_CLIENT_ID=                    # Mercado Pago OAuth
MP_CLIENT_SECRET=                # Mercado Pago OAuth
```

## Lo que NUNCA hacer

❌ `refreshInterval` en SWR — usar Supabase Realtime  
❌ `window.location.reload()` — usar `router.refresh()` o `mutate()`  
❌ Consultas Prisma sin `localId` en rutas multi-tenant  
❌ `params` sin `await` en Route Handlers de Next.js 15  
❌ Clientes externos instanciados a nivel de módulo en Route Handlers  
❌ Polling de cualquier tipo (setInterval, setTimeout recursivo)  
❌ Insights o sugerencias automáticas en analytics — solo datos duros  
❌ Recharts formatters sin casteo a `number`/`string` — usar `any` controlado  
❌ Nombres en inglés para entidades de dominio (`pedido`, `mesa`, `mozo`, etc.)  
❌ RLS como única capa de seguridad — Prisma bypasea RLS  
❌ Canales Supabase sin cleanup en `return` del `useEffect`  
❌ Mutar datos sin verificar ownership (`findFirst` con `localId` antes de `update`)  

---

# NOTAS ARQUITECTÓNICAS

# • El campo `impreso` en `Pedido` tiene doble función: flag real de impresión Y trigger artificial de Realtime para cancelaciones parciales (flip true→false). Cambiar su semántica rompe KDS + flujo de cancelaciones.
# • La ausencia de estado intermedio de preparación como estado principal (PENDIENTE → ENTREGADO) es decisión de negocio irreversible. EN_PREPARACION solo existe transitoriamente cuando un sector despacha pero el otro no.
# • Supabase Realtime es el único canal de reactividad. Si se migra fuera de Supabase, reemplazar TODOS los listeners (KDSListener, ClienteListener, MesasListener, ServicioListener, admin layout channels). No hay fallback de polling.
# • El `localId` del cliente viene de la mesa/sesión (no de cookie). Esto permite operación anónima con aislamiento de datos correcto.
# • AudioManager usa sessionStorage para sobrevivir router.refresh()/HMR — el unlock persiste durante toda la sesión del navegador.