# Superadmin: Detalle de Local + Panel de Alertas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una página de detalle individual por local y un panel de alertas proactivo en el dashboard superadmin.

**Architecture:** Dos subsistemas independientes: (1) una nueva page `/superadmin/locales/[id]` con su propia API route de detalle, (2) un panel de alertas en el dashboard existente consumiendo un nuevo endpoint `/api/superadmin/alertas`. Ambos siguen el mismo patrón "use client" + fetch manual ya usado en el dashboard.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Prisma, Recharts (gráfico semanal), Lucide React

---

## Contexto del codebase

- Dashboard superadmin: `app/superadmin/dashboard/page.tsx` (único archivo, 1010 líneas, "use client")
- APIs existentes: `app/api/superadmin/locales/route.ts`, `app/api/superadmin/locales/[id]/route.ts`
- Auth superadmin: `getSuperAdmin()` de `@/lib/auth` → retorna session o null
- Tema visual: `bg-gray-950`, texto `text-white/gray-*`, bordes `border-gray-800`, acentos `emerald/violet/blue/red`
- Formato moneda: `new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)`
- SQL raw en Prisma: `prisma.$queryRaw<T[]>\`...\`` con backtick template

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `app/api/superadmin/locales/[id]/detalle/route.ts` | Crear | Devuelve datos completos de un local: info, admin, config, counts, métricas 7d/30d, ventas semanales 8 semanas |
| `app/api/superadmin/alertas/route.ts` | Crear | Calcula y devuelve lista de alertas activas (trial_por_vencer, inactivo, pago_vencido, invite_vencido) |
| `app/superadmin/locales/[id]/page.tsx` | Crear | Página de detalle del local (client component, fetch manual) |
| `app/superadmin/dashboard/page.tsx` | Modificar | Agregar sección AlertasPanel al inicio del `<main>`, debajo de los KPIs |

---

## Task 1: API de detalle del local

**Files:**
- Create: `app/api/superadmin/locales/[id]/detalle/route.ts`

### Tipos de respuesta

```typescript
interface LocalDetalleResponse {
  id: number;
  nombre: string;
  slug: string | null;
  direccion: string | null;
  estado: string;         // "ACTIVO" | "DEMO" | "SUSPENDIDO" | "BAJA"
  plan: string;           // "DEMO" | "BASIC" | "PRO" | "ENTERPRISE"
  montoPlan: number;
  trialHasta: string | null;   // ISO string
  fechaVence: string | null;   // ISO string
  fechaAlta: string;           // ISO string
  notasAdmin: string | null;
  // Mercado Pago
  mpEmail: string | null;
  mpConectadoEn: string | null;
  // Admin del local
  admin: {
    id: number;
    nombre: string;
    email: string;
    activo: boolean;
    inviteExpira: string | null;
    fechaAlta: string;
  } | null;
  // Configuración operativa
  config: {
    horaApertura: string;
    horaCierre: string;
    usaStock: boolean;
    alertaKdsMinutos: number;
  } | null;
  // Inventario
  counts: {
    mesas: number;
    categorias: number;
    productos: number;
    mozos: number;
  };
  // Métricas de uso
  metricas: {
    ultimos7: { sesiones: number; ventas: number };
    ultimos30: { sesiones: number; ventas: number; ticketPromedio: number };
    porSemana: { semana: string; ventas: number; sesiones: number }[];
  };
}
```

- [ ] **Step 1: Crear el archivo de la ruta**

Crear `app/api/superadmin/locales/[id]/detalle/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const localId = Number(id);
  if (isNaN(localId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  // ── 1. Datos del local + admin + config ──────────────────────────────
  const local = await prisma.local.findUnique({
    where: { id: localId },
    include: {
      usuarios: {
        where: { rol: "ADMIN" },
        select: { id: true, nombre: true, email: true, activo: true, inviteExpira: true, fechaAlta: true },
        take: 1,
      },
      configuracion: {
        select: { horaApertura: true, horaCierre: true, usaStock: true, alertaKdsMinutos: true },
      },
      _count: {
        select: {
          mesas: { where: { activo: true } },
          categorias: true,
          productos: { where: { activo: true } },
          usuarios: { where: { rol: "MOZO", activo: true } },
        },
      },
    },
  });

  if (!local) return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });

  // ── 2. Métricas 7 días ────────────────────────────────────────────────
  const ahora = new Date();
  const hace7  = new Date(ahora); hace7.setDate(ahora.getDate() - 7);
  const hace30 = new Date(ahora); hace30.setDate(ahora.getDate() - 30);

  const [met7, met30] = await Promise.all([
    prisma.sesion.aggregate({
      where: { localId, fechaFin: { gte: hace7, not: null } },
      _count: { id: true },
      _sum:   { totalVenta: true },
    }),
    prisma.sesion.aggregate({
      where: { localId, fechaFin: { gte: hace30, not: null } },
      _count: { id: true },
      _sum:   { totalVenta: true },
      _avg:   { totalVenta: true },
    }),
  ]);

  // ── 3. Ventas por semana (últimas 8 semanas) ──────────────────────────
  const hace8semanas = new Date(ahora);
  hace8semanas.setDate(ahora.getDate() - 56);

  type SemanaRow = { semana: string; ventas: number; sesiones: bigint };
  const rawSemanas = await prisma.$queryRaw<SemanaRow[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('week', "fechaFin"), 'YYYY-"W"IW') AS semana,
      COALESCE(SUM("totalVenta"), 0)::float                  AS ventas,
      COUNT(*)                                               AS sesiones
    FROM "sesion"
    WHERE "localId" = ${localId}
      AND "fechaFin" >= ${hace8semanas}
      AND "fechaFin" IS NOT NULL
    GROUP BY DATE_TRUNC('week', "fechaFin")
    ORDER BY DATE_TRUNC('week', "fechaFin") ASC
  `;

  const porSemana = rawSemanas.map((r) => ({
    semana:   r.semana,
    ventas:   Number(r.ventas),
    sesiones: Number(r.sesiones),
  }));

  // ── 4. Armar respuesta ────────────────────────────────────────────────
  const admin = local.usuarios[0] ?? null;

  return NextResponse.json({
    id:          local.id,
    nombre:      local.nombre,
    slug:        local.slug,
    direccion:   local.direccion,
    estado:      local.estado,
    plan:        local.plan,
    montoPlan:   local.montoPlan,
    trialHasta:  local.trialHasta,
    fechaVence:  local.fechaVence,
    fechaAlta:   local.fechaAlta,
    notasAdmin:  local.notasAdmin,
    mpEmail:     local.mpEmail,
    mpConectadoEn: local.mpConectadoEn,
    admin:       admin ? {
      id:          admin.id,
      nombre:      admin.nombre,
      email:       admin.email,
      activo:      admin.activo,
      inviteExpira: admin.inviteExpira,
      fechaAlta:   admin.fechaAlta,
    } : null,
    config: local.configuracion ? {
      horaApertura:     local.configuracion.horaApertura,
      horaCierre:       local.configuracion.horaCierre,
      usaStock:         local.configuracion.usaStock,
      alertaKdsMinutos: local.configuracion.alertaKdsMinutos,
    } : null,
    counts: {
      mesas:     local._count.mesas,
      categorias: local._count.categorias,
      productos: local._count.productos,
      mozos:     local._count.usuarios,
    },
    metricas: {
      ultimos7: {
        sesiones: met7._count.id,
        ventas:   met7._sum.totalVenta ?? 0,
      },
      ultimos30: {
        sesiones:       met30._count.id,
        ventas:         met30._sum.totalVenta ?? 0,
        ticketPromedio: met30._avg.totalVenta ? Math.round(met30._avg.totalVenta) : 0,
      },
      porSemana,
    },
  });
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sin errores (o solo warnings de otras partes del proyecto).

- [ ] **Step 3: Commit**

```bash
git add app/api/superadmin/locales/[id]/detalle/route.ts
git commit -m "feat(superadmin): API GET /locales/[id]/detalle con métricas completas"
```

---

## Task 2: Página de detalle del local

**Files:**
- Create: `app/superadmin/locales/[id]/page.tsx`

Esta página sigue el mismo patrón visual del dashboard (dark theme, `bg-gray-950`). Usa `useRouter` para la navegación de vuelta y fetch manual para los datos.

- [ ] **Step 1: Crear la página de detalle**

Crear `app/superadmin/locales/[id]/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Store, CheckCircle2, AlertCircle, Ban, XCircle,
  Mail, Clock, CalendarDays, CreditCard, Utensils, Users,
  LayoutGrid, ShoppingBag, Wifi, WifiOff, RefreshCcw,
  TrendingUp, Receipt, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface LocalDetalle {
  id: number;
  nombre: string;
  slug: string | null;
  direccion: string | null;
  estado: string;
  plan: string;
  montoPlan: number;
  trialHasta: string | null;
  fechaVence: string | null;
  fechaAlta: string;
  notasAdmin: string | null;
  mpEmail: string | null;
  mpConectadoEn: string | null;
  admin: {
    id: number;
    nombre: string;
    email: string;
    activo: boolean;
    inviteExpira: string | null;
    fechaAlta: string;
  } | null;
  config: {
    horaApertura: string;
    horaCierre: string;
    usaStock: boolean;
    alertaKdsMinutos: number;
  } | null;
  counts: { mesas: number; categorias: number; productos: number; mozos: number };
  metricas: {
    ultimos7:  { sesiones: number; ventas: number };
    ultimos30: { sesiones: number; ventas: number; ticketPromedio: number };
    porSemana: { semana: string; ventas: number; sesiones: number }[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADO_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  ACTIVO:     { label: "Activo",     cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 size={13} /> },
  DEMO:       { label: "Trial",      cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",         icon: <Clock size={13} /> },
  SUSPENDIDO: { label: "Suspendido", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",      icon: <AlertCircle size={13} /> },
  BAJA:       { label: "Baja",       cls: "bg-red-500/10 text-red-400 border-red-500/20",            icon: <XCircle size={13} /> },
};

const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  DEMO:       { label: "Demo",       cls: "text-blue-400 bg-blue-500/10" },
  BASIC:      { label: "Basic",      cls: "text-gray-400 bg-gray-500/10" },
  PRO:        { label: "Pro",        cls: "text-violet-400 bg-violet-500/10" },
  ENTERPRISE: { label: "Enterprise", cls: "text-amber-400 bg-amber-500/10" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);
}

function fechaCorta(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function diasRestantes(fecha: string | null) {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86_400_000);
}

// ─── Componentes pequeños ─────────────────────────────────────────────────────
function Chip({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-gray-200 text-sm text-right">{value}</span>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="text-gray-400">{icon}</div>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function KpiMini({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-xl">{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Indicador de salud ───────────────────────────────────────────────────────
function SaludIndicador({ sesiones7d, estado }: { sesiones7d: number; estado: string }) {
  if (estado === "BAJA" || estado === "SUSPENDIDO") {
    return <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">Inactivo</span>;
  }
  if (sesiones7d >= 10) {
    return <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">Saludable</span>;
  }
  if (sesiones7d >= 1) {
    return <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">Baja actividad</span>;
  }
  return <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">Sin actividad</span>;
}

// ─── Tooltip del gráfico ──────────────────────────────────────────────────────
function TooltipVentas({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-white font-semibold">{fmt(Number(payload[0]?.value ?? 0))}</p>
      <p className="text-gray-500">{payload[1]?.value ?? 0} sesiones</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════════
export default function DetalleLocalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<LocalDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/locales/${id}/detalle`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error cargando el local");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { fetchData(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pantalla de carga ─────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-600" size={32} />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <AlertCircle className="text-red-400" size={40} />
        <p className="text-white font-semibold">{error ?? "Local no encontrado"}</p>
        <button onClick={() => router.push("/superadmin/dashboard")}
          className="text-sm text-gray-400 hover:text-white transition">
          ← Volver al dashboard
        </button>
      </div>
    );
  }

  const estadoBadge = ESTADO_BADGE[data.estado] ?? ESTADO_BADGE["BAJA"];
  const planBadge   = PLAN_BADGE[data.plan] ?? PLAN_BADGE["BASIC"];
  const diasTrial   = diasRestantes(data.trialHasta);
  const diasVence   = diasRestantes(data.fechaVence);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/superadmin/dashboard")}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-gray-800 transition">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-white font-bold text-base leading-none">{data.nombre}</h1>
              {data.slug && <p className="text-gray-600 text-xs mt-0.5">/{data.slug}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaludIndicador sesiones7d={data.metricas.ultimos7.sesiones} estado={data.estado} />
            <Chip cls={estadoBadge.cls}>{estadoBadge.icon}{estadoBadge.label}</Chip>
            <Chip cls={`${planBadge.cls} border-transparent`}>{planBadge.label}</Chip>
            <button onClick={fetchData}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition">
              <RefreshCcw size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* ─── KPIs ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiMini label="Ventas (30 días)" value={fmt(data.metricas.ultimos30.ventas)} sub={`${data.metricas.ultimos30.sesiones} sesiones`} />
          <KpiMini label="Ticket promedio" value={data.metricas.ultimos30.ticketPromedio > 0 ? fmt(data.metricas.ultimos30.ticketPromedio) : "—"} />
          <KpiMini label="Sesiones (7 días)" value={data.metricas.ultimos7.sesiones} />
          <KpiMini label="Ventas (7 días)" value={fmt(data.metricas.ultimos7.ventas)} />
        </div>

        {/* ─── GRÁFICO DE ACTIVIDAD SEMANAL ────────────────────────────────── */}
        {data.metricas.porSemana.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Actividad semanal (últimas 8 semanas)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.metricas.porSemana} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="semana" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: any) => `$${Math.round(Number(v) / 1000)}k`} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<TooltipVentas />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="ventas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sesiones" fill="#1f2937" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ─── GRID DE CARDS ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Admin */}
          <Card title="Admin del local" icon={<Users size={16} />}>
            {data.admin ? (
              <>
                <InfoRow label="Nombre" value={data.admin.nombre} />
                <InfoRow label="Email" value={<span className="font-mono text-xs">{data.admin.email}</span>} />
                <InfoRow label="Cuenta" value={
                  data.admin.activo
                    ? <span className="text-emerald-400 font-semibold text-xs">Activada</span>
                    : <span className="text-amber-400 font-semibold text-xs">Pendiente activación</span>
                } />
                {!data.admin.activo && data.admin.inviteExpira && (
                  <InfoRow label="Invite vence" value={
                    <span className={diasRestantes(data.admin.inviteExpira) !== null && diasRestantes(data.admin.inviteExpira)! < 0 ? "text-red-400" : "text-gray-300"}>
                      {fechaCorta(data.admin.inviteExpira)}
                    </span>
                  } />
                )}
                <InfoRow label="Alta admin" value={fechaCorta(data.admin.fechaAlta)} />
              </>
            ) : (
              <p className="text-gray-600 text-sm">Sin admin asignado</p>
            )}
          </Card>

          {/* Facturación */}
          <Card title="Facturación" icon={<CreditCard size={16} />}>
            <InfoRow label="Plan" value={<span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${planBadge.cls}`}>{planBadge.label}</span>} />
            <InfoRow label="Monto mensual" value={data.montoPlan > 0 ? fmt(data.montoPlan) : "—"} />
            <InfoRow label="Alta del local" value={fechaCorta(data.fechaAlta)} />
            {data.trialHasta && (
              <InfoRow label="Trial hasta" value={
                <span className={diasTrial !== null && diasTrial <= 3 ? "text-amber-400 font-semibold" : "text-gray-300"}>
                  {fechaCorta(data.trialHasta)}{diasTrial !== null && ` (${diasTrial}d)`}
                </span>
              } />
            )}
            {data.fechaVence && (
              <InfoRow label="Vence" value={
                <span className={diasVence !== null && diasVence < 0 ? "text-red-400 font-semibold" : "text-gray-300"}>
                  {fechaCorta(data.fechaVence)}{diasVence !== null && diasVence < 0 && " ⚠️ vencido"}
                </span>
              } />
            )}
          </Card>

          {/* Configuración */}
          <Card title="Configuración operativa" icon={<Clock size={16} />}>
            <InfoRow label="Horario" value={data.config ? `${data.config.horaApertura} – ${data.config.horaCierre}` : "—"} />
            <InfoRow label="Control de stock" value={data.config?.usaStock ? "Activado" : "Desactivado"} />
            <InfoRow label="Alerta KDS" value={data.config ? `${data.config.alertaKdsMinutos} min` : "—"} />
          </Card>

          {/* Inventario */}
          <Card title="Inventario del local" icon={<Store size={16} />}>
            <InfoRow label="Mesas activas" value={data.counts.mesas} />
            <InfoRow label="Categorías" value={data.counts.categorias} />
            <InfoRow label="Productos activos" value={data.counts.productos} />
            <InfoRow label="Mozos activos" value={data.counts.mozos} />
          </Card>

          {/* Mercado Pago */}
          <Card title="Mercado Pago" icon={<Receipt size={16} />}>
            {data.mpEmail ? (
              <>
                <InfoRow label="Cuenta" value={<span className="font-mono text-xs">{data.mpEmail}</span>} />
                <InfoRow label="Conectado" value={fechaCorta(data.mpConectadoEn)} />
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Wifi size={12} /> Integración activa
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <WifiOff size={14} /> Sin integración MP
              </div>
            )}
          </Card>

          {/* Notas internas */}
          <Card title="Notas internas" icon={<TrendingUp size={16} />}>
            {data.notasAdmin ? (
              <p className="text-gray-300 text-sm leading-relaxed">{data.notasAdmin}</p>
            ) : (
              <p className="text-gray-600 text-sm">Sin notas</p>
            )}
          </Card>

        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sin errores.

- [ ] **Step 3: Verificar acceso en browser**

Ir a `http://localhost:3000/superadmin/locales/1` (reemplazar 1 con un ID real).
Esperado: página carga, muestra datos del local. Botón ← vuelve al dashboard.

- [ ] **Step 4: Agregar link "Ver detalle" en el dashboard**

En `app/superadmin/dashboard/page.tsx`, buscar el handler `onVerDetalle` en `AccionesDropdown`. Actualmente llama a `onVerDetalle()` que abre el modal. Hay que navegar a la nueva página.

Primero importar `useRouter` en el componente principal. En la función donde se pasa `onVerDetalle` al dropdown (en el `return` principal del componente), reemplazar el callback para que navegue:

Buscar en el render del mapa de `localesFiltrados` donde se instancia `<AccionesDropdown>` y cambiar:
```typescript
// ANTES (abre modal):
onVerDetalle={() => setModalDetalle(local)}
// DESPUÉS (navega a la página):
onVerDetalle={() => router.push(`/superadmin/locales/${local.id}`)}
```

Agregar el import al tope del archivo:
```typescript
import { useRouter } from "next/navigation";
```

Y dentro del componente `AdminDashboardPage` (el componente principal), agregar:
```typescript
const router = useRouter();
```

- [ ] **Step 5: Commit**

```bash
git add app/superadmin/locales/[id]/page.tsx app/superadmin/dashboard/page.tsx
git commit -m "feat(superadmin): página de detalle por local con métricas y gráfico semanal"
```

---

## Task 3: API de alertas

**Files:**
- Create: `app/api/superadmin/alertas/route.ts`

Las alertas son calculadas en tiempo real, sin persistencia en DB. Cuatro tipos:

| tipo | condición |
|------|-----------|
| `TRIAL_POR_VENCER` | `estado = DEMO` y `trialHasta` entre hoy y +7 días |
| `PAGO_VENCIDO` | `estado = ACTIVO` y `fechaVence` < hoy |
| `INACTIVO` | `estado = ACTIVO` y 0 sesiones cerradas en últimos 7 días |
| `INVITE_VENCIDO` | admin con `activo = false` e `inviteExpira` < hoy |

- [ ] **Step 1: Crear la ruta de alertas**

Crear `app/api/superadmin/alertas/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface Alerta {
  tipo: "TRIAL_POR_VENCER" | "PAGO_VENCIDO" | "INACTIVO" | "INVITE_VENCIDO";
  severidad: "alta" | "media";
  localId: number;
  localNombre: string;
  detalle: string;
}

export async function GET() {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const ahora = new Date();
  const en7dias = new Date(ahora); en7dias.setDate(ahora.getDate() + 7);
  const hace7dias = new Date(ahora); hace7dias.setDate(ahora.getDate() - 7);

  // ── Locales en trial por vencer ──────────────────────────────────────
  const trialPorVencer = await prisma.local.findMany({
    where: {
      estado: "DEMO",
      trialHasta: { gte: ahora, lte: en7dias },
    },
    select: { id: true, nombre: true, trialHasta: true },
  });

  // ── Locales con pago vencido ─────────────────────────────────────────
  const pagoVencido = await prisma.local.findMany({
    where: {
      estado: "ACTIVO",
      fechaVence: { lt: ahora },
    },
    select: { id: true, nombre: true, fechaVence: true },
  });

  // ── Locales activos con 0 sesiones en últimos 7 días ─────────────────
  const localesActivos = await prisma.local.findMany({
    where: { estado: "ACTIVO" },
    select: { id: true, nombre: true },
  });

  const sesionesRecientes = await prisma.sesion.groupBy({
    by: ["localId"],
    where: { fechaFin: { gte: hace7dias }, localId: { in: localesActivos.map((l) => l.id) } },
    _count: { id: true },
  });
  const conActividad = new Set(sesionesRecientes.map((s) => s.localId));
  const inactivos = localesActivos.filter((l) => !conActividad.has(l.id));

  // ── Admins con invite vencido sin activar ────────────────────────────
  const invitesVencidos = await prisma.usuario.findMany({
    where: {
      rol: "ADMIN",
      activo: false,
      inviteExpira: { lt: ahora },
      localId: { not: null },
    },
    select: {
      id: true,
      nombre: true,
      inviteExpira: true,
      local: { select: { id: true, nombre: true } },
    },
  });

  // ── Armar lista de alertas ───────────────────────────────────────────
  const alertas: Alerta[] = [];

  for (const l of pagoVencido) {
    const diasVencido = Math.ceil((ahora.getTime() - new Date(l.fechaVence!).getTime()) / 86_400_000);
    alertas.push({
      tipo:        "PAGO_VENCIDO",
      severidad:   "alta",
      localId:     l.id,
      localNombre: l.nombre,
      detalle:     `Pago vencido hace ${diasVencido} día${diasVencido !== 1 ? "s" : ""}`,
    });
  }

  for (const l of trialPorVencer) {
    const dias = Math.ceil((new Date(l.trialHasta!).getTime() - ahora.getTime()) / 86_400_000);
    alertas.push({
      tipo:        "TRIAL_POR_VENCER",
      severidad:   dias <= 2 ? "alta" : "media",
      localId:     l.id,
      localNombre: l.nombre,
      detalle:     `Trial vence en ${dias} día${dias !== 1 ? "s" : ""}`,
    });
  }

  for (const l of inactivos) {
    alertas.push({
      tipo:        "INACTIVO",
      severidad:   "media",
      localId:     l.id,
      localNombre: l.nombre,
      detalle:     "Sin actividad en los últimos 7 días",
    });
  }

  for (const u of invitesVencidos) {
    if (!u.local) continue;
    alertas.push({
      tipo:        "INVITE_VENCIDO",
      severidad:   "media",
      localId:     u.local.id,
      localNombre: u.local.nombre,
      detalle:     `Invite de ${u.nombre} venció y no fue activado`,
    });
  }

  // Ordenar: alta primero
  alertas.sort((a, b) => (a.severidad === "alta" ? -1 : 1) - (b.severidad === "alta" ? -1 : 1));

  return NextResponse.json({ alertas });
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/superadmin/alertas/route.ts
git commit -m "feat(superadmin): API GET /alertas con 4 tipos de alerta"
```

---

## Task 4: Panel de alertas en el dashboard

**Files:**
- Modify: `app/superadmin/dashboard/page.tsx`

El panel se agrega dentro del `<main>` del dashboard, entre los KPIs y la tabla de locales. Se carga con un fetch independiente al cargar la página.

- [ ] **Step 1: Agregar tipo Alerta y estado alertas al componente principal**

En `app/superadmin/dashboard/page.tsx`, agregar debajo de la interfaz `LocalRow` al tope del archivo:

```typescript
interface Alerta {
  tipo: "TRIAL_POR_VENCER" | "PAGO_VENCIDO" | "INACTIVO" | "INVITE_VENCIDO";
  severidad: "alta" | "media";
  localId: number;
  localNombre: string;
  detalle: string;
}
```

Dentro del componente principal (`AdminDashboardPage` o el nombre que tenga), agregar state y fetch:

```typescript
const [alertas, setAlertas] = useState<Alerta[]>([]);

const fetchAlertas = useCallback(async () => {
  try {
    const res = await fetch("/api/superadmin/alertas");
    const d   = await res.json();
    if (res.ok) setAlertas(d.alertas ?? []);
  } catch {}
}, []);

useEffect(() => { fetchAlertas(); }, [fetchAlertas]);
```

El `fetchAlertas` también debe llamarse desde el botón de refresh ya existente. Buscar donde está `fetchLocales()` y agregar `fetchAlertas()`:

```typescript
// Botón refresh existente: onClick={fetchLocales}
// Cambiar a:
onClick={() => { fetchLocales(); fetchAlertas(); }}
```

- [ ] **Step 2: Agregar componente AlertasPanel dentro del mismo archivo**

Antes del `return` del componente principal, agregar la función `AlertasPanel`:

```typescript
const ALERTA_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string; dot: string }> = {
  PAGO_VENCIDO:      { label: "Pago vencido",       icon: <CreditCard size={13} />,    cls: "text-red-400 bg-red-500/10 border-red-500/20",    dot: "bg-red-400" },
  TRIAL_POR_VENCER:  { label: "Trial por vencer",   icon: <Clock size={13} />,         cls: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400" },
  INACTIVO:          { label: "Sin actividad",       icon: <AlertCircle size={13} />,   cls: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400" },
  INVITE_VENCIDO:    { label: "Invite vencido",      icon: <Mail size={13} />,          cls: "text-blue-400 bg-blue-500/10 border-blue-500/20",   dot: "bg-blue-400" },
};
```

> **Nota:** Los imports `CreditCard`, `Clock`, `AlertCircle`, `Mail` ya están disponibles o agregar al bloque de imports de lucide-react.

```typescript
function AlertasPanel({ alertas, onVerLocal }: { alertas: Alerta[]; onVerLocal: (id: number) => void }) {
  const [expandido, setExpandido] = useState(true);

  if (alertas.length === 0) return null;

  const altas = alertas.filter((a) => a.severidad === "alta");

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition"
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle size={16} className={altas.length > 0 ? "text-red-400" : "text-amber-400"} />
          <span className="text-white font-semibold text-sm">Alertas activas</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${altas.length > 0 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
            {alertas.length}
          </span>
          {altas.length > 0 && (
            <span className="text-xs text-red-400">{altas.length} urgente{altas.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${expandido ? "rotate-180" : ""}`} />
      </button>

      {expandido && (
        <div className="border-t border-gray-800 divide-y divide-gray-800">
          {alertas.map((alerta, i) => {
            const cfg = ALERTA_CONFIG[alerta.tipo];
            return (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mr-2 ${cfg.cls}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                    <span className="text-white text-sm font-medium">{alerta.localNombre}</span>
                    <span className="text-gray-500 text-xs ml-2">— {alerta.detalle}</span>
                  </div>
                </div>
                <button
                  onClick={() => onVerLocal(alerta.localId)}
                  className="text-xs text-gray-500 hover:text-white transition px-2 py-1 rounded-lg hover:bg-gray-700 flex-shrink-0"
                >
                  Ver local →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Insertar AlertasPanel en el JSX del dashboard**

En el `return` del componente principal, dentro de `<main className="...">`, después del bloque de KPIs (`</div>` que cierra el `grid grid-cols-2 md:grid-cols-4`), agregar:

```typescript
{/* Alertas */}
<AlertasPanel alertas={alertas} onVerLocal={(id) => router.push(`/superadmin/locales/${id}`)} />
```

- [ ] **Step 4: Verificar que los imports necesarios están presentes**

Confirmar que en el bloque `import { ... } from "lucide-react"` al tope del archivo están: `CreditCard`, `Clock`, `AlertCircle`, `Mail`. Si alguno falta, agregarlo. El import `ChevronDown` ya existe.

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sin errores.

- [ ] **Step 6: Verificar en browser**

Abrir `http://localhost:3000/superadmin/dashboard`.
- Si hay locales con alertas: el panel aparece debajo de los KPIs con el contador correcto.
- Si no hay alertas: el panel no aparece (renderiza `null`).
- Clic en "Ver local →": navega a `/superadmin/locales/[id]`.
- Botón de refresh: recarga locales Y alertas.

- [ ] **Step 7: Commit final**

```bash
git add app/superadmin/dashboard/page.tsx
git commit -m "feat(superadmin): panel de alertas en dashboard (trial, pago vencido, inactivos, invites)"
```

---

## Self-Review

### Spec coverage

| Requisito | Task |
|-----------|------|
| Página dedicada por local | Task 2 |
| Info del local (admin, plan, config, notas, MP) | Task 2 |
| Métricas de uso (sesiones, ventas, ticket) | Task 1 + Task 2 |
| Gráfico de actividad histórica | Task 2 (Recharts semanal) |
| Indicador de salud | Task 2 (`SaludIndicador`) |
| Alertas por trial por vencer | Task 3 + 4 |
| Alertas por inactivos | Task 3 + 4 |
| Alertas por pago vencido | Task 3 + 4 |
| Alertas por invites sin activar | Task 3 + 4 |
| Link de alerta → detalle local | Task 4 (onVerLocal) |
| Botón refresh incluye alertas | Task 4 (Step 1) |

### Checks

- ✅ No hay `refreshInterval` ni polling — fetch manual al cargar
- ✅ Todos los queries Prisma usan `localId` o son queries de superadmin (sin filtro de tenant intencional)
- ✅ `params` con `await` en route handlers (Next.js 15)
- ✅ `getSuperAdmin()` en todas las rutas nuevas
- ✅ Tipos consistentes entre API y page (`LocalDetalle`, `Alerta`)
- ✅ Recharts con `any` controlado en tooltip formatter
