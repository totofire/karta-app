"use client";
import { useState, useEffect } from "react";
import TopProductos from "./TopProductos";
import TicketSesiones from "./TicketSesiones";
import RendimientoMesas from "./RendimientoMesas";
import VelocidadServicio from "./VelocidadServicio";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, BarChart2, CalendarDays,
  Minus, ShoppingBag, Trophy, Loader2, UtensilsCrossed, Clock, Armchair, Timer,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type Range     = "7d" | "4w" | "12m";
type ChartType = "area" | "bar";
type Tab       = "ventas" | "productos" | "ticket" | "mesas" | "velocidad";

interface DataPoint {
  label: string; fecha: string; total: number; sesiones: number;
}
interface Resumen {
  totalPeriodo: number; totalSesiones: number; ticketPromedio: number;
  mejorDia: { label: string; total: number }; prevTotal: number; variacion: number;
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
const TooltipCustom = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 min-w-[140px]">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
      <p className="text-green-400 font-black text-xl leading-none">
        ${Number(payload[0].value).toLocaleString("es-AR")}
      </p>
      {payload[1] && (
        <p className="text-slate-400 text-xs font-bold mt-1">{payload[1].value} sesiones</p>
      )}
    </div>
  );
};

// ─── TARJETA MÉTRICA ──────────────────────────────────────────────────────────
const MetricCard = ({
  label, value, sub, icon: Icon, highlight = false, loading,
}: {
  label: string; value: string; sub?: string;
  icon: any; highlight?: boolean; loading: boolean;
}) => (
  <div className={`relative rounded-2xl p-5 border overflow-hidden flex flex-col justify-between gap-3
    ${highlight ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"}`}
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl pointer-events-none
      ${highlight ? "bg-green-500/20" : "bg-red-500/10"}`} />
    <div className="flex items-start justify-between relative z-10">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className={`p-2 rounded-xl ${highlight ? "bg-white/10" : "bg-slate-50 border border-slate-100"}`}>
        <Icon size={16} className={highlight ? "text-green-400" : "text-slate-500"} />
      </div>
    </div>
    <div className="relative z-10">
      {loading ? (
        <div className={`h-8 w-32 rounded-lg animate-pulse ${highlight ? "bg-slate-700" : "bg-slate-100"}`} />
      ) : (
        <p className={`font-black text-3xl tracking-tight leading-none ${highlight ? "text-white" : "text-slate-900"}`}>
          {value}
        </p>
      )}
      {sub && !loading && (
        <p className="text-xs font-medium mt-1.5 text-slate-400">{sub}</p>
      )}
    </div>
  </div>
);

// ─── BADGE VARIACIÓN ──────────────────────────────────────────────────────────
const VariacionBadge = ({ variacion, loading }: { variacion: number; loading: boolean }) => {
  if (loading) return <div className="h-8 w-28 bg-slate-100 rounded-xl animate-pulse" />;
  const pos   = variacion > 0;
  const igual = variacion === 0;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-black
      ${igual ? "bg-slate-100 text-slate-500"
        : pos  ? "bg-green-50 text-green-700 border border-green-100"
               : "bg-red-50 text-red-700 border border-red-100"}`}
    >
      {igual ? <Minus size={14} /> : pos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {pos && !igual ? "+" : ""}{variacion}% vs período anterior
    </div>
  );
};

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; icon: any; desc: string }[] = [
  { key: "ventas",     label: "Ventas",     icon: BarChart2,       desc: "Evolución y totales del período"  },
  { key: "productos",  label: "Productos",  icon: UtensilsCrossed, desc: "Ranking por unidades e ingresos"  },
  { key: "ticket",     label: "Ticket",     icon: Clock,           desc: "Promedio, duración y horarios"    },
  { key: "mesas",      label: "Mesas",      icon: Armchair,        desc: "Rendimiento por mesa"             },
  { key: "velocidad",  label: "Velocidad",  icon: Timer,           desc: "Tiempo de servicio y atención"    },
];

const RANGES: { key: Range; label: string }[] = [
  { key: "7d",  label: "7 días"    },
  { key: "4w",  label: "4 semanas" },
  { key: "12m", label: "12 meses"  },
];

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [tab,       setTab]       = useState<Tab>("ventas");
  const [range,     setRange]     = useState<Range>("7d");
  const [chartType, setChartType] = useState<ChartType>("area");

  const [data,    setData]    = useState<DataPoint[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab !== "ventas") return;
    const cargar = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/admin/analytics?mode=ventas_periodo&range=${range}`);
        const json = await res.json();
        setData(json.data      || []);
        setResumen(json.resumen || null);
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    cargar();
  }, [range, tab]);

  const maxTotal = data.length ? Math.max(...data.map((d) => d.total)) * 1.2 : 100;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32 space-y-6">

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <BarChart2 className="text-slate-400" size={32} />
            ANALYTICS
          </h1>
          <p className="text-slate-500 font-medium mt-1">Métricas clave de tu negocio</p>
        </div>

        {/* Selector de rango — aplica a todos los tabs */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all
                ${range === key
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CARD PRINCIPAL CON TABS ───────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Barra de tabs */}
        <div className="grid grid-cols-3 md:grid-cols-5 border-b border-slate-100">
          {TABS.map(({ key, label, icon: Icon, desc }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex flex-col md:flex-row items-center md:items-start gap-2 p-4 md:p-5 transition-all text-left group
                ${tab === key ? "bg-slate-50" : "hover:bg-slate-50/50"}`}
            >
              {/* Indicador activo */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all
                ${tab === key ? "bg-slate-900" : "bg-transparent"}`}
              />

              <div className={`p-2.5 rounded-xl flex-shrink-0 transition-all
                ${tab === key
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"}`}
              >
                <Icon size={18} />
              </div>

              <div className="min-w-0">
                <p className={`font-black text-sm transition-colors
                  ${tab === key ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`}>
                  {label}
                </p>
                <p className="text-[10px] text-slate-400 font-medium hidden md:block leading-tight mt-0.5">
                  {desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* ── CONTENIDO DEL TAB ────────────────────────────────── */}
        <div className="p-6">

          {/* TAB 1 — VENTAS */}
          {tab === "ventas" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-span-2 lg:col-span-1">
                  <MetricCard
                    label="Recaudación"
                    value={resumen ? `$${resumen.totalPeriodo.toLocaleString("es-AR")}` : "$0"}
                    sub={`${resumen?.totalSesiones ?? 0} sesiones`}
                    icon={TrendingUp} highlight loading={loading}
                  />
                </div>
                <MetricCard
                  label="Ticket Promedio"
                  value={resumen ? `$${resumen.ticketPromedio.toLocaleString("es-AR")}` : "$0"}
                  sub="por sesión" icon={ShoppingBag} loading={loading}
                />
                <MetricCard
                  label="Mejor Día"
                  value={resumen?.mejorDia?.label ?? "—"}
                  sub={resumen ? `$${resumen.mejorDia.total.toLocaleString("es-AR")}` : undefined}
                  icon={Trophy} loading={loading}
                />
                <MetricCard
                  label="Sesiones"
                  value={resumen ? `${resumen.totalSesiones}` : "0"}
                  sub="mesas cerradas" icon={CalendarDays} loading={loading}
                />
              </div>

              {/* Cabecera gráfico */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <VariacionBadge variacion={resumen?.variacion ?? 0} loading={loading} />
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                  {(["area", "bar"] as ChartType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setChartType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all
                        ${chartType === t
                          ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                          : "text-slate-400 hover:text-slate-600"}`}
                    >
                      {t === "area" ? "Área" : "Barras"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gráfico */}
              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-slate-300">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-sm font-medium">Cargando datos...</span>
                  </div>
                </div>
              ) : data.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-300">
                  <div className="text-center">
                    <BarChart2 size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Sin datos en este período</p>
                  </div>
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "area" ? (
                      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false}
                          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                          interval={range === "4w" ? 3 : 0}
                        />
                        <YAxis axisLine={false} tickLine={false} width={52}
                          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                          tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                          domain={[0, maxTotal]}
                        />
                        <Tooltip content={<TooltipCustom />} />
                        <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3}
                          fill="url(#gradTotal)" dot={false}
                          activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
                          animationDuration={600}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false}
                          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                          interval={range === "4w" ? 3 : 0}
                        />
                        <YAxis axisLine={false} tickLine={false} width={52}
                          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                          tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                          domain={[0, maxTotal]}
                        />
                        <Tooltip content={<TooltipCustom />} />
                        <Bar dataKey="total" fill="#0f172a" radius={[6,6,0,0]}
                          maxBarSize={48} animationDuration={600}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabla top 5 */}
              {!loading && data.filter((d) => d.total > 0).length > 0 && (
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                      <tr>
                        <th className="p-3 pl-5">Período</th>
                        <th className="p-3 text-right">Ventas</th>
                        <th className="p-3 pr-5 text-right">Sesiones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[...data]
                        .filter((d) => d.total > 0)
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 5)
                        .map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 pl-5 text-sm font-bold text-slate-700">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-green-500" : "bg-slate-200"}`} />
                                {d.label}
                              </div>
                            </td>
                            <td className="p-3 text-right font-black text-slate-900">
                              ${d.total.toLocaleString("es-AR")}
                            </td>
                            <td className="p-3 pr-5 text-right text-sm text-slate-400 font-bold">
                              {d.sesiones}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 — PRODUCTOS */}
          {tab === "productos" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TopProductos range={range} />
            </div>
          )}

          {/* TAB 3 — TICKET & SESIONES */}
          {tab === "ticket" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TicketSesiones range={range} />
            </div>
          )}

          {/* TAB 4 — MESAS */}
          {tab === "mesas" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <RendimientoMesas range={range} />
            </div>
          )}

          {/* TAB 5 — VELOCIDAD */}
          {tab === "velocidad" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <VelocidadServicio range={range} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}