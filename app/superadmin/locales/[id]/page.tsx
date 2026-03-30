"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Store, CheckCircle2, AlertCircle, XCircle,
  Clock, CreditCard, Users, Receipt, RefreshCcw, Loader2,
  TrendingUp, Wifi, WifiOff,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { ValueType, NameType, Payload } from "recharts/types/component/DefaultTooltipContent";

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
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function diasRestantes(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86_400_000);
}

// ─── Pequeños componentes ─────────────────────────────────────────────────────
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

function TooltipVentas({ active, payload, label }: { active?: boolean; payload?: Payload<ValueType, NameType>[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-white font-semibold">{fmt(Number(payload[0]?.value ?? 0))}</p>
      <p className="text-gray-500">{Number(payload[1]?.value ?? 0)} sesiones</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PÁGINA
// ════════════════════════════════════════════════════════════════════════════════
export default function DetalleLocalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<LocalDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-600" size={32} />
      </div>
    );
  }

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

      {/* HEADER */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/superadmin/dashboard")}
              aria-label="Volver al dashboard"
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
              aria-label="Actualizar"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition">
              <RefreshCcw size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiMini
            label="Ventas (30 días)"
            value={fmt(data.metricas.ultimos30.ventas)}
            sub={`${data.metricas.ultimos30.sesiones} sesiones`}
          />
          <KpiMini
            label="Ticket promedio"
            value={data.metricas.ultimos30.ticketPromedio > 0 ? fmt(data.metricas.ultimos30.ticketPromedio) : "—"}
          />
          <KpiMini label="Sesiones (7 días)" value={data.metricas.ultimos7.sesiones} />
          <KpiMini label="Ventas (7 días)" value={fmt(data.metricas.ultimos7.ventas)} />
        </div>

        {/* GRÁFICO SEMANAL */}
        {data.metricas.porSemana.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Actividad semanal (últimas 8 semanas)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.metricas.porSemana} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="semana"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<TooltipVentas />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="ventas"   fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sesiones" fill="#1f2937" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Admin */}
          <Card title="Admin del local" icon={<Users size={16} />}>
            {data.admin ? (
              <>
                <InfoRow label="Nombre" value={data.admin.nombre} />
                <InfoRow label="Email"  value={<span className="font-mono text-xs">{data.admin.email}</span>} />
                <InfoRow label="Cuenta" value={
                  data.admin.activo
                    ? <span className="text-emerald-400 font-semibold text-xs">Activada</span>
                    : <span className="text-amber-400 font-semibold text-xs">Pendiente activación</span>
                } />
                {!data.admin.activo && data.admin.inviteExpira && (
                  <InfoRow label="Invite vence" value={
                    <span className={(diasRestantes(data.admin.inviteExpira) ?? 1) < 0 ? "text-red-400" : "text-gray-300"}>
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
            <InfoRow label="Plan" value={
              <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${planBadge.cls}`}>
                {planBadge.label}
              </span>
            } />
            <InfoRow label="Monto mensual" value={data.montoPlan > 0 ? fmt(data.montoPlan) : "—"} />
            <InfoRow label="Alta del local"  value={fechaCorta(data.fechaAlta)} />
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
                  {fechaCorta(data.fechaVence)}{diasVence !== null && diasVence < 0 && <span className="text-red-400 font-semibold"> vencido</span>}
                </span>
              } />
            )}
          </Card>

          {/* Configuración */}
          <Card title="Configuración operativa" icon={<Clock size={16} />}>
            <InfoRow label="Horario"        value={data.config ? `${data.config.horaApertura} – ${data.config.horaCierre}` : "—"} />
            <InfoRow label="Control stock"  value={data.config?.usaStock ? "Activado" : "Desactivado"} />
            <InfoRow label="Alerta KDS"     value={data.config ? `${data.config.alertaKdsMinutos} min` : "—"} />
          </Card>

          {/* Inventario */}
          <Card title="Inventario del local" icon={<Store size={16} />}>
            <InfoRow label="Mesas activas"    value={data.counts.mesas} />
            <InfoRow label="Categorías"       value={data.counts.categorias} />
            <InfoRow label="Productos activos" value={data.counts.productos} />
            <InfoRow label="Mozos activos"    value={data.counts.mozos} />
          </Card>

          {/* Mercado Pago */}
          <Card title="Mercado Pago" icon={<Receipt size={16} />}>
            {data.mpEmail ? (
              <>
                <InfoRow label="Cuenta"    value={<span className="font-mono text-xs">{data.mpEmail}</span>} />
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

          {/* Notas */}
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
