"use client";
import { useState, useEffect } from "react";
import {
  ComposedChart, Bar, Line, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Timer, TrendingDown, CheckCircle2, AlertTriangle, Loader2, ChefHat } from "lucide-react";

type Range = "7d" | "4w" | "12m";

interface SeriePunto {
  label:      string;
  pedidos:    number;
  avg_espera: number;
  min_espera: number;
  max_espera: number;
}

interface BucketDist {
  label:    string;
  key:      string;
  cantidad: number;
  pct:      number;
  color:    string;
}

interface Resumen {
  totalPedidos: number;
  avgEspera:    number;
  medianEspera: number;
  bajo10Pct:    number;
}

// ── Tooltip del gráfico de tendencia ─────────────────────────────────────────
const TooltipEspera = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const avg     = payload.find((p: any) => p.dataKey === "avg_espera");
  const pedidos = payload.find((p: any) => p.dataKey === "pedidos");
  return (
    <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 min-w-[160px] space-y-2">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p>
      {avg && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase">Espera promedio</p>
          <p className={`font-black text-lg leading-none ${
            avg.value <= 10 ? "text-green-400" : avg.value <= 20 ? "text-amber-400" : "text-red-400"
          }`}>
            {avg.value} min
          </p>
        </div>
      )}
      {pedidos && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase">Pedidos</p>
          <p className="text-slate-300 font-black text-lg leading-none">{pedidos.value}</p>
        </div>
      )}
    </div>
  );
};

// ── Semáforo de performance ───────────────────────────────────────────────────
const BadgeEspera = ({ minutos }: { minutos: number }) => {
  const { label, color } =
    minutos <= 8  ? { label: "Excelente", color: "bg-green-100 text-green-700 border-green-200"  } :
    minutos <= 12 ? { label: "Bueno",     color: "bg-blue-100 text-blue-700 border-blue-200"    } :
    minutos <= 20 ? { label: "Regular",   color: "bg-amber-100 text-amber-700 border-amber-200" } :
                    { label: "Lento",     color: "bg-red-100 text-red-700 border-red-200"        };
  return (
    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${color}`}>
      {label}
    </span>
  );
};

// ── KPI chip ─────────────────────────────────────────────────────────────────
const KpiChip = ({
  icon: Icon, label, value, sub, color,
}: { icon: any; label: string; value: string; sub?: string; color: string }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color}`}>
    <Icon size={18} className="flex-shrink-0 opacity-70" />
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider opacity-60">{label}</p>
      <p className="font-black text-lg leading-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-50 font-medium">{sub}</p>}
    </div>
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
export default function TiempoEspera({ range }: { range: Range }) {
  const [serie,         setSerie]         = useState<SeriePunto[]>([]);
  const [distribucion,  setDistribucion]  = useState<BucketDist[]>([]);
  const [resumen,       setResumen]       = useState<Resumen | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [vistaGrafico,  setVistaGrafico]  = useState<"tendencia" | "distribucion">("tendencia");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/admin/analytics?mode=tiempo_espera&range=${range}`);
        const json = await res.json();
        setSerie(json.serie              || []);
        setDistribucion(json.distribucion || []);
        setResumen(json.resumen          || null);
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    cargar();
  }, [range]);

  const maxEspera  = serie.length ? Math.max(...serie.map((d) => d.avg_espera)) * 1.3 : 30;
  const maxPedidos = serie.length ? Math.max(...serie.map((d) => d.pedidos))    * 1.3 : 10;
  const maxDist    = distribucion.length ? Math.max(...distribucion.map((d) => d.cantidad)) * 1.15 : 10;

  return (
    <div className="space-y-6">

      {/* ── KPI CHIPS ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiChip
            icon={Timer}
            label="Espera promedio"
            value={`${resumen.avgEspera} min`}
            color="text-slate-700 bg-white border-slate-200"
          />
          <KpiChip
            icon={TrendingDown}
            label="Mediana"
            value={`${resumen.medianEspera} min`}
            sub="50% de pedidos"
            color="text-slate-700 bg-white border-slate-200"
          />
          <KpiChip
            icon={CheckCircle2}
            label="En ≤ 10 min"
            value={`${resumen.bajo10Pct}%`}
            sub="de pedidos"
            color={
              resumen.bajo10Pct >= 80
                ? "text-green-700 bg-green-50 border-green-200"
                : resumen.bajo10Pct >= 60
                  ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-red-700 bg-red-50 border-red-200"
            }
          />
          <KpiChip
            icon={ChefHat}
            label="Total pedidos"
            value={`${resumen.totalPedidos}`}
            sub="despachados"
            color="text-slate-700 bg-white border-slate-200"
          />
        </div>
      )}

      {/* ── CABECERA CON SEMÁFORO + TOGGLE ───────────────────────── */}
      {!loading && resumen && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Timer size={16} className="text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-600 font-medium">
              Tiempo promedio de espera
            </span>
            <BadgeEspera minutos={resumen.avgEspera} />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setVistaGrafico("tendencia")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all
                ${vistaGrafico === "tendencia"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"}`}
            >
              Tendencia
            </button>
            <button
              onClick={() => setVistaGrafico("distribucion")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all
                ${vistaGrafico === "distribucion"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"}`}
            >
              Distribución
            </button>
          </div>
        </div>
      )}

      {/* ── LOADING / VACÍO ──────────────────────────────────────── */}
      {loading && (
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm font-medium">Calculando tiempos de espera...</span>
          </div>
        </div>
      )}

      {!loading && serie.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-300">
          <ChefHat size={48} className="opacity-30" />
          <div className="text-center">
            <p className="font-black text-slate-400">Sin pedidos despachados en este período</p>
            <p className="text-sm text-slate-300 mt-1">
              Los datos aparecerán cuando cocina o barra marquen pedidos como listos
            </p>
          </div>
        </div>
      )}

      {/* ── GRÁFICO TENDENCIA ────────────────────────────────────── */}
      {!loading && serie.length > 0 && vistaGrafico === "tendencia" && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEspera" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e2e8f0" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#e2e8f0" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                interval={range === "4w" ? 3 : 0}
              />
              {/* Eje izquierdo: minutos de espera */}
              <YAxis
                yAxisId="left"
                axisLine={false} tickLine={false} width={40}
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                tickFormatter={(v) => `${v}m`}
                domain={[0, maxEspera]}
              />
              {/* Eje derecho: cantidad de pedidos */}
              <YAxis
                yAxisId="right" orientation="right"
                axisLine={false} tickLine={false} width={30}
                tick={{ fontSize: 11, fill: "#cbd5e1", fontWeight: 700 }}
                domain={[0, maxPedidos]}
              />
              <Tooltip content={<TooltipEspera />} />

              {/* Barras de cantidad (fondo) */}
              <Bar
                yAxisId="right" dataKey="pedidos"
                fill="url(#gradEspera)" stroke="#e2e8f0" strokeWidth={1}
                radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={600}
              />

              {/* Línea de espera promedio — color dinámico por valor */}
              <Line
                yAxisId="left" type="monotone" dataKey="avg_espera"
                stroke="#0f172a" strokeWidth={3} dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const color =
                    payload.avg_espera <= 10 ? "#10b981"
                    : payload.avg_espera <= 20 ? "#f59e0b"
                    : "#ef4444";
                  return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill={color} strokeWidth={0} />;
                }}
                activeDot={{ r: 7, strokeWidth: 0, fill: "#0f172a" }}
                animationDuration={600}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── GRÁFICO DISTRIBUCIÓN ─────────────────────────────────── */}
      {!loading && distribucion.length > 0 && vistaGrafico === "distribucion" && (
        <div className="space-y-4">
          {/* Barras horizontales con porcentaje */}
          <div className="space-y-3">
            {distribucion.map((b) => (
              <div key={b.key} className="flex items-center gap-3">
                {/* Etiqueta */}
                <span className="w-20 text-xs font-black text-slate-500 flex-shrink-0">{b.label}</span>

                {/* Barra */}
                <div className="flex-1 h-8 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative">
                  <div
                    className="h-full rounded-xl transition-all duration-700 flex items-center px-3"
                    style={{ width: `${Math.max(b.pct, 4)}%`, backgroundColor: b.color }}
                  >
                    {b.pct > 10 && (
                      <span className="text-white text-[10px] font-black">{b.pct}%</span>
                    )}
                  </div>
                  {b.pct <= 10 && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400"
                      style={{ left: `calc(${Math.max(b.pct, 4)}% + 8px)` }}
                    >
                      {b.pct}%
                    </span>
                  )}
                </div>

                {/* Cantidad */}
                <span className="w-16 text-xs font-black text-slate-500 text-right flex-shrink-0">
                  {b.cantidad} ped.
                </span>
              </div>
            ))}
          </div>

          {/* Mini leyenda interpretativa */}
          {resumen && (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={16}
                  className={`flex-shrink-0 mt-0.5 ${
                    resumen.bajo10Pct >= 70 ? "text-green-500" : "text-amber-500"
                  }`}
                />
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  {resumen.bajo10Pct >= 80
                    ? `El ${resumen.bajo10Pct}% de los pedidos salen en ≤ 10 minutos. Excelente velocidad de servicio.`
                    : resumen.bajo10Pct >= 60
                      ? `El ${resumen.bajo10Pct}% de los pedidos salen en ≤ 10 minutos. Hay margen para mejorar.`
                      : `Solo el ${resumen.bajo10Pct}% de los pedidos salen en ≤ 10 minutos. Puede estar afectando la experiencia del cliente.`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LEYENDA (solo en tendencia) ───────────────────────────── */}
      {!loading && serie.length > 0 && vistaGrafico === "tendencia" && (
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 rounded-full bg-slate-900" />
            <span className="text-xs font-bold text-slate-400">Espera promedio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm bg-slate-200 border border-slate-100" />
            <span className="text-xs font-bold text-slate-400">Pedidos despachados</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            {[
              { color: "#10b981", label: "≤ 10 min" },
              { color: "#f59e0b", label: "10–20 min" },
              { color: "#ef4444", label: "> 20 min" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TABLA DE REFERENCIA ──────────────────────────────────── */}
      {!loading && resumen && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Referencia de tiempos de espera
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Excelente", rango: "≤ 8 min",  color: "bg-green-100 text-green-700" },
              { label: "Bueno",     rango: "8–12 min", color: "bg-blue-100 text-blue-700"   },
              { label: "Regular",   rango: "12–20 min",color: "bg-amber-100 text-amber-700" },
              { label: "Lento",     rango: "> 20 min", color: "bg-red-100 text-red-700"     },
            ].map(({ label, rango, color }) => (
              <div key={label} className={`px-3 py-2 rounded-xl ${color} text-center`}>
                <p className="font-black text-xs">{label}</p>
                <p className="text-[10px] font-bold opacity-70">{rango}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}