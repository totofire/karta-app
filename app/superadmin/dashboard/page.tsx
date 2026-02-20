"use client";

import { useEffect, useState } from "react";
import {
  Plus, Store, TrendingUp, Clock, ShieldAlert,
  Loader2, AlertCircle, CheckCircle2, X,
  ChevronDown, Search, MoreHorizontal,
  Building2, Users, BadgeCheck
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface LocalRow {
  id:         number;
  nombre:     string;
  slug:       string | null;
  estado:     string;
  plan:       string;
  montoPlan:  number;
  trialHasta: string | null;
  fechaAlta:  string;
  notasAdmin: string | null;
  admin:      { nombre: string; email: string; activo: boolean } | null;
  mesas:      number;
  mes: {
    ventaTotal:     number;
    sesiones:       number;
    ticketPromedio: number;
  };
}

interface DashboardData {
  locales: LocalRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  ACTIVO:     { label: "Activo",     cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  DEMO:       { label: "Demo",       cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  SUSPENDIDO: { label: "Suspendido", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  BAJA:       { label: "Baja",       cls: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
};

const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  DEMO:       { label: "Demo",       cls: "text-blue-400" },
  BASIC:      { label: "Basic",      cls: "text-gray-400" },
  PRO:        { label: "Pro",        cls: "text-violet-400" },
  ENTERPRISE: { label: "Enterprise", cls: "text-amber-400" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function diasRestantes(fecha: string | null) {
  if (!fecha) return null;
  const diff = new Date(fecha).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Modal Nuevo Local ────────────────────────────────────────────────────────
interface ModalProps {
  onClose:   () => void;
  onCreated: (local: LocalRow) => void;
}

function ModalNuevoLocal({ onClose, onCreated }: ModalProps) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [form, setForm] = useState({
    nombreLocal:  "",
    direccion:    "",
    nombreAdmin:  "",
    emailAdmin:   "",
    plan:         "DEMO",
    trialDias:    "14",
  });

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res  = await fetch("/api/superadmin/locales", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...form,
        trialDias: Number(form.trialDias),
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Ocurrió un error.");
      return;
    }

    // Refetch mínimo — devolvemos el nuevo local como row parcial
    onCreated({
      id:         data.local.id,
      nombre:     data.local.nombre,
      slug:       data.local.slug,
      estado:     "DEMO",
      plan:       form.plan,
      montoPlan:  0,
      trialHasta: data.local.trialHasta,
      fechaAlta:  new Date().toISOString(),
      notasAdmin: null,
      admin: {
        nombre: form.nombreAdmin,
        email:  form.emailAdmin,
        activo: false,
      },
      mesas: 0,
      mes:   { ventaTotal: 0, sesiones: 0, ticketPromedio: 0 },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Building2 size={18} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Nuevo local</h2>
              <p className="text-gray-500 text-xs">Se enviará un invite al email del dueño</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 transition p-1"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Sección local */}
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">
              Datos del local
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Nombre del local *</label>
                <input
                  required
                  value={form.nombreLocal}
                  onChange={(e) => update("nombreLocal", e.target.value)}
                  placeholder="Ej: Bar El Toro"
                  className="input-dark w-full"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Dirección</label>
                <input
                  value={form.direccion}
                  onChange={(e) => update("direccion", e.target.value)}
                  placeholder="Ej: Corrientes 1234, CABA"
                  className="input-dark w-full"
                />
              </div>
            </div>

            {/* Sección admin */}
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 pt-2">
              Dueño / Admin
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Nombre *</label>
                <input
                  required
                  value={form.nombreAdmin}
                  onChange={(e) => update("nombreAdmin", e.target.value)}
                  placeholder="Juan Pérez"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email *</label>
                <input
                  required
                  type="email"
                  value={form.emailAdmin}
                  onChange={(e) => update("emailAdmin", e.target.value)}
                  placeholder="juan@bar.com"
                  className="input-dark w-full"
                />
              </div>
            </div>

            {/* Sección plan */}
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 pt-2">
              Plan inicial
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Plan</label>
                <div className="relative">
                  <select
                    value={form.plan}
                    onChange={(e) => update("plan", e.target.value)}
                    className="input-dark w-full appearance-none pr-8"
                  >
                    <option value="DEMO">Demo</option>
                    <option value="BASIC">Basic</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Días de trial</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={form.trialDias}
                  onChange={(e) => update("trialDias", e.target.value)}
                  className="input-dark w-full"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 hover:text-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/40 disabled:cursor-not-allowed text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Creando…</>
              ) : (
                <><CheckCircle2 size={14} /> Crear y enviar invite</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const [data,         setData]         = useState<DashboardData | null>(null);
  const [cargando,     setCargando]     = useState(true);
  const [busqueda,     setBusqueda]     = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [modalAbierto, setModalAbierto] = useState(false);

  // Fetch inicial
  useEffect(() => {
    fetch("/api/superadmin/locales")
      .then((r) => r.json())
      .then((d) => { setData(d); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  // KPIs globales derivados de los datos
  const locales       = data?.locales ?? [];
  const totalActivos  = locales.filter((l) => l.estado === "ACTIVO").length;
  const totalDemo     = locales.filter((l) => l.estado === "DEMO").length;
  const totalSuspendidos = locales.filter((l) => l.estado === "SUSPENDIDO").length;
  const mrr           = locales.reduce((s, l) => s + l.montoPlan, 0);
  const ventasMes     = locales.reduce((s, l) => s + l.mes.ventaTotal, 0);

  // Filtrado
  const localesFiltrados = locales.filter((l) => {
    const matchBusqueda = l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      l.admin?.email.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado   = filtroEstado === "TODOS" || l.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  function handleLocalCreado(local: LocalRow) {
    setData((prev) => prev
      ? { ...prev, locales: [local, ...prev.locales] }
      : { locales: [local] }
    );
    setModalAbierto(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Header ── */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BadgeCheck size={16} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">Karta</h1>
            <p className="text-gray-600 text-xs mt-0.5">Super Admin</p>
          </div>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
        >
          <Plus size={16} />
          Nuevo local
        </button>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto space-y-6">

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<Store size={18} className="text-emerald-400" />}
            label="Locales activos"
            value={totalActivos}
            bg="bg-emerald-500/5 border-emerald-500/10"
          />
          <KpiCard
            icon={<Clock size={18} className="text-blue-400" />}
            label="En trial"
            value={totalDemo}
            bg="bg-blue-500/5 border-blue-500/10"
          />
          <KpiCard
            icon={<TrendingUp size={18} className="text-violet-400" />}
            label="MRR"
            value={fmt(mrr)}
            bg="bg-violet-500/5 border-violet-500/10"
          />
          <KpiCard
            icon={<ShieldAlert size={18} className="text-red-400" />}
            label="Suspendidos"
            value={totalSuspendidos}
            bg="bg-red-500/5 border-red-500/10"
          />
        </div>

        {/* ── Resumen ventas ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-widest font-medium">
              Volumen total procesado este mes
            </p>
            <p className="text-3xl font-bold text-white mt-1">{fmt(ventasMes)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs uppercase tracking-widest font-medium">
              Locales en la plataforma
            </p>
            <p className="text-3xl font-bold text-white mt-1">{locales.length}</p>
          </div>
        </div>

        {/* ── Tabla ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o email…"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition"
              />
            </div>

            {/* Filtros estado */}
            <div className="flex gap-1.5">
              {["TODOS", "ACTIVO", "DEMO", "SUSPENDIDO", "BAJA"].map((e) => (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filtroEstado === e
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {e === "TODOS" ? "Todos" : ESTADO_BADGE[e]?.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {cargando ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              <p className="text-gray-600 text-sm">Cargando locales…</p>
            </div>
          ) : localesFiltrados.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2">
              <Store size={28} className="text-gray-700" />
              <p className="text-gray-600 text-sm">No hay locales que coincidan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {["Local", "Estado", "Plan", "Admin", "Mesas", "Ventas mes", "Sesiones", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {localesFiltrados.map((local) => {
                    const estadoBadge = ESTADO_BADGE[local.estado] ?? ESTADO_BADGE.BAJA;
                    const planBadge   = PLAN_BADGE[local.plan]     ?? PLAN_BADGE.BASIC;
                    const dias        = diasRestantes(local.trialHasta);

                    return (
                      <tr key={local.id} className="hover:bg-gray-800/30 transition">

                        {/* Local */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white">{local.nombre}</p>
                          {local.slug && (
                            <p className="text-gray-600 text-xs mt-0.5">/{local.slug}</p>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${estadoBadge.cls}`}>
                            {estadoBadge.label}
                          </span>
                          {local.estado === "DEMO" && dias !== null && (
                            <p className={`text-xs mt-1 ${dias <= 3 ? "text-red-400" : "text-gray-500"}`}>
                              {dias > 0 ? `${dias}d restantes` : "Expirado"}
                            </p>
                          )}
                        </td>

                        {/* Plan */}
                        <td className="px-5 py-4">
                          <span className={`font-semibold ${planBadge.cls}`}>
                            {planBadge.label}
                          </span>
                          {local.montoPlan > 0 && (
                            <p className="text-gray-600 text-xs mt-0.5">{fmt(local.montoPlan)}/mes</p>
                          )}
                        </td>

                        {/* Admin */}
                        <td className="px-5 py-4">
                          {local.admin ? (
                            <>
                              <p className="text-gray-300">{local.admin.nombre}</p>
                              <p className="text-gray-600 text-xs mt-0.5">{local.admin.email}</p>
                              {!local.admin.activo && (
                                <span className="text-amber-500 text-xs">Pendiente activación</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-700 text-xs">Sin admin</span>
                          )}
                        </td>

                        {/* Mesas */}
                        <td className="px-5 py-4 text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Users size={13} className="text-gray-600" />
                            {local.mesas}
                          </div>
                        </td>

                        {/* Ventas mes */}
                        <td className="px-5 py-4">
                          <p className="text-white font-medium">{fmt(local.mes.ventaTotal)}</p>
                          {local.mes.ticketPromedio > 0 && (
                            <p className="text-gray-600 text-xs mt-0.5">
                              ticket: {fmt(local.mes.ticketPromedio)}
                            </p>
                          )}
                        </td>

                        {/* Sesiones */}
                        <td className="px-5 py-4 text-gray-400">
                          {local.mes.sesiones}
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4">
                          <button className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-gray-800 transition">
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal ── */}
      {modalAbierto && (
        <ModalNuevoLocal
          onClose={() => setModalAbierto(false)}
          onCreated={handleLocalCreado}
        />
      )}

      {/* ── Estilos globales inline ── */}
      <style jsx global>{`
        .input-dark {
          background: rgb(31 41 55);
          border: 1px solid rgb(55 65 81);
          border-radius: 0.75rem;
          padding: 0.625rem 1rem;
          color: white;
          font-size: 0.875rem;
          transition: border-color 0.15s;
        }
        .input-dark:focus {
          outline: none;
          border-color: rgb(16 185 129 / 0.5);
          box-shadow: 0 0 0 3px rgb(16 185 129 / 0.08);
        }
        .input-dark::placeholder {
          color: rgb(75 85 99);
        }
      `}</style>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon, label, value, bg,
}: {
  icon:  React.ReactNode;
  label: string;
  value: string | number;
  bg:    string;
}) {
  return (
    <div className={`border rounded-2xl px-5 py-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-xs text-gray-500 font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}