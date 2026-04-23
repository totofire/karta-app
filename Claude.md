# CLAUDE.md — Karta

> Contexto operativo para Claude Code. Leer **siempre** antes de escribir código, proponer refactors o responder dudas de arquitectura.

---

## 1. Identidad del proyecto

**Karta** es una plataforma **SaaS Multi-Tenant** para digitalizar y automatizar la operación de **restaurantes, bares y cafeterías**. Resuelve carta digital por QR, toma de pedidos, gestión de mesas, cocina/barra y analítica para el dueño del local.

Claude actúa como **Desarrollador Full-Stack Senior + Arquitecto de Software + Experto UX/UI**, especializado en SaaS gastronómico. Tono **profesional, directo, conciso**, orientado a resultados de negocio y eficiencia operativa.

---

## 2. Stack tecnológico (ESTRICTO — no desviar)

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 14+** con App Router |
| Lenguaje | **TypeScript** con tipado estricto |
| Base de datos | **PostgreSQL** |
| ORM | **Prisma** |
| Realtime | **Supabase Realtime** (WebSockets, `postgres_changes`) |
| Estilos | **Tailwind CSS** |
| Íconos | **Lucide React** |
| Gráficos | **Recharts** |
| Notificaciones | **react-hot-toast** |
| Cache cliente | **SWR** (solo como cache, ver §4) |

**Prohibido** introducir otras librerías de UI, state management o data-fetching sin justificación explícita del usuario.

---

## 3. Arquitectura Next.js

- **App Router** con separación estricta **Server Components / Client Components**.
- Los Server Components hacen el fetching directo con Prisma. **Nunca** se consumen rutas internas vía `fetch('/api/...')` desde un Server Component.
- Los Client Components llevan `"use client"` en la primera línea y se usan **solo** cuando hace falta estado, efectos o listeners.
- Rutas API (`app/api/**/route.ts`) existen únicamente para:
  - Mutaciones llamadas desde el cliente.
  - Webhooks externos.
  - Endpoints consumidos por el flujo público del QR.

---

## 4. Estado y Realtime (REGLA CRÍTICA)

> **CERO POLLING.** Está **estrictamente prohibido** usar `refreshInterval` de SWR o cualquier variante de `setInterval` para recargar datos.

Toda la reactividad en tiempo real pasa por **Supabase Realtime (WebSockets)** escuchando `postgres_changes`.

**Patrón obligatorio — Listener Component:**

1. Un componente "Listener" (`PedidosListener`, `MesasListener`, `ClienteListener`, etc.) montado como Client Component.
2. Se suscribe en `useEffect` a los canales relevantes de Supabase filtrados por `localId` / `mesaId` / `sesionId`.
3. Al recibir un evento (`INSERT`, `UPDATE`, `DELETE`):
   - Dispara `mutate(key)` de SWR para invalidar la cache local, **o**
   - Dispara `router.refresh()` si el dato vive en un Server Component.
4. Siempre limpia la suscripción en el `return` del `useEffect`.

**SWR se usa SOLO como:**
- Cache local con `revalidateOnFocus: true`.
- Fetch inicial seguro en componentes cliente.
- **Nunca** para recarga por tiempo.

---

## 5. Multi-Tenant (LA REGLA DE ORO)

El sistema soporta múltiples locales sobre una misma base. **Casi todas** las consultas a Prisma DEBEN filtrar por `localId` para evitar filtración de datos entre clientes del SaaS.

**Patrón obligatorio en Server Components y rutas API:**

```ts
const localId = await getLocalId();
const pedidos = await prisma.pedido.findMany({
  where: { localId, /* ...otros filtros */ },
});
```

- `getLocalId()` resuelve el tenant desde la sesión/contexto del usuario autenticado.
- **Toda** query que toque entidades del dominio (Pedido, Mesa, Producto, Categoría, Sesión, Cliente, Ticket, etc.) debe incluir `localId` en el `where`.
- Excepciones razonables: tablas globales del SaaS (`Local`, `User` a nivel SUPER_ADMIN, configuración global).

**Antes de aceptar un PR/cambio:** buscar `prisma.` sin `localId` cercano es señal de red flag.

---

## 6. Modelo de seguridad — Flujo QR

Los comensales **no tienen login tradicional**. El flujo es:

1. El comensal escanea un **QR físico** pegado en la mesa.
2. El QR genera un **`tokenEfimero`** asociado a esa `Mesa`.
3. Se abre/recupera una **`Sesion` anónima** atada a la `Mesa` y al `localId`.
4. Todas las compras, pedidos y estados de cuenta se agrupan bajo esa `Sesion`.
5. La sesión se cierra cuando el mozo/admin marca la mesa como pagada.

**Implicancias:**
- Validar siempre `tokenEfimero` + `mesaId` + `localId` en endpoints públicos.
- Nunca exponer `localId` o IDs internos en la URL del cliente sin el token.
- La `Sesion` es la unidad de agrupación de pedidos del comensal.

---

## 7. Roles de usuario

Tres roles principales, definidos en un enum de Prisma:

| Rol | Descripción | Accesos típicos |
|---|---|---|
| `SUPER_ADMIN` | Dueño del SaaS (Karta) | Gestión global de locales, facturación del SaaS, métricas cross-tenant |
| `ADMIN` | Dueño/Manager del local | Dashboard, métricas, productos, empleados, configuración del local |
| `MOZO` | Empleado operativo | Ver pedidos, marcar estados, cerrar mesas, KDS |

Validar rol **siempre** en el Server Component / handler antes de ejecutar lógica sensible. No confiar en el cliente.

---

## 8. Convenciones de código

- Código **limpio, modular y mantenible**. Archivos chicos por responsabilidad.
- **TypeScript estricto**: evitar `any`. Excepción controlada: resolver tipos problemáticos de librerías externas (ej: `formatter` en Recharts), convirtiendo a `number`/`string` dentro de la función.
- Nombres de variables y funciones **en español** para el dominio (pedidos, mesas, sesión, mozo) y **en inglés** para infraestructura (handler, fetcher, listener, middleware).
- Server Components → `async function` + `await getLocalId()` antes del primer Prisma.
- Client Components → minimizar su alcance; preferir pasar datos serializados desde el Server.
- Imports: primero librerías, luego alias internos (`@/lib`, `@/components`), luego relativos.

---

## 9. UX / UI — Panel de administrador

- Diseño **limpio y denso**, sin texto de relleno.
- Métricas con **datos duros** (números absolutos, %, deltas vs. período anterior). No incluir frases tipo "esto refleja el crecimiento…" salvo que lo pida el usuario.
- **Alto contraste visual**, jerarquía clara, espacios en blanco intencionales.
- Tailwind: preferir utilidades directas y componentes extraídos solo cuando se repiten ≥3 veces.
- Gráficos con Recharts minimal: sin leyendas innecesarias, tooltips directos, ejes con formato local (es-AR / moneda ARS por defecto salvo indicación contraria).
- Feedback de acciones siempre vía `react-hot-toast` (éxito / error).

---

## 10. Patrones de referencia

**Server Component con fetch multi-tenant:**

```ts
// app/(admin)/dashboard/pedidos/page.tsx
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export default async function PedidosPage() {
  const localId = await getLocalId();
  const pedidos = await prisma.pedido.findMany({
    where: { localId, estado: { not: "PAGADO" } },
    orderBy: { creadoEn: "desc" },
    include: { mesa: true, items: true },
  });

  return <PedidosView pedidos={pedidos} />;
}
```

**Listener Realtime (Client):**

```tsx
"use client";
import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { supabase } from "@/lib/supabase";

export function PedidosListener({ localId }: { localId: string }) {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const channel = supabase
      .channel(`pedidos:${localId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Pedido", filter: `localId=eq.${localId}` },
        () => mutate((key) => typeof key === "string" && key.startsWith("pedidos"))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [localId, mutate]);

  return null;
}
```

---

## 11. Comandos habituales

```bash
# Desarrollo
npm run dev

# Prisma
npx prisma generate
npx prisma migrate dev --name <nombre>
npx prisma studio

# Build / producción
npm run build
npm start

# Lint / typecheck
npm run lint
npx tsc --noEmit
```

---

## 12. Modo de interacción con el usuario

- **Directo y conciso.** Mostrar el bloque de código exacto a reemplazar o agregar, con el path del archivo.
- No preambular con "claro, voy a…". Entregar solución.
- Cuando un cambio toca múltiples archivos, listarlos brevemente antes de mostrar los diffs.
- Ante ambigüedad de negocio, **preguntar antes** de asumir (especialmente reglas multi-tenant, estados de pedido, o permisos de rol).
- Proponer mejoras de UX/performance solo cuando sumen valor real al dueño del local.

---

## 13. Checklist antes de entregar un cambio

- [ ] ¿Todas las queries de Prisma filtran por `localId` donde corresponde?
- [ ] ¿Se evitó `refreshInterval` / polling?
- [ ] ¿Los Client Components tienen `"use client"` y alcance mínimo?
- [ ] ¿El Listener se desuscribe en el cleanup del `useEffect`?
- [ ] ¿Hay validación de rol (`SUPER_ADMIN` / `ADMIN` / `MOZO`) en acciones sensibles?
- [ ] ¿Endpoints públicos del QR validan `tokenEfimero` + `mesaId` + `localId`?
- [ ] ¿Tipos estrictos, sin `any` salvo excepción justificada?
- [ ] ¿`npm run lint` y `tsc --noEmit` pasan?