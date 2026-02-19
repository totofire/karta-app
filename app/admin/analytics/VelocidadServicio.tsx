"use client";
import { useState, useEffect } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Timer, Clock, Users, AlertCircle, Loader2, Zap } from "lucide-react";

type Range = "7d" | "4w" | "12m";

interface DataPoint {
  label:                string;
  sesiones:             number;
  tiempo_primer_pedido: number;
  duracion_sesion:      number;
}

interface Resumen {
  totalSesiones:     number;
  timerPrimerPedido: number;
  duracionPromedio:  number;
  sesionesSinPedido: number;
}

const TooltipVelocidad = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const tiempoP = payload.find((p: any) => p.dataKey === "tiempo_primer_pedido");
  const duracion = payload.find((p: any) => p.dataKey === "duracion_sesion");
  const sesiones = payload.find((p: any) => p.dataKey === "sesiones");
  return (
    <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 min-w-[170px] space-y-2">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p>
      {tiempoP && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase">1er pedido</p>
          <p className="text-amber-400 font-black text-lg leading-none">{tiempoP.value} min</p>
        </div>
      )}
      {duracion && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase">Duración sesión</p>
          <p className="text-blue-400 font-black text-lg leading-none">{duracion.value} min</p>
        </div>
      )}
      {sesiones && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase">Sesiones</p>
          <p className="text-slate-300 font-black text-lg leading-none">{sesiones.value}</p>
        </div>
      )}
    </div>
  );
};

// Chip de KPI
const KpiChip = ({
  icon: Icon, label, value, color,
}: { icon: any; label: string; value: string; color: string }) => (
  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${color}`}>
    <Icon size={16} className="flex-shrink-0 opacity-70" />
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider opacity-60">{label}</p>
      <p className="font-black text-base leading-tight">{value}</p>
    </div>
  </div>
);

// Badge semáforo de velocidad
const BadgeVelocidad = ({ minutos }: { minutos: number }) => {
  const { label, color } =
    minutos <= 3  ? { label: "Excelente",  color: "bg-green-100 text-green-700 border-green-200" } :
    minutos <= 6  ? { label: "Bueno",      color: "bg-blue-100 text-blue-700 border-blue-200"  } :
    minutos <= 10 ? { label: "Regular",    color: "bg-amber-100 text-amber-700 border-amber-200" } :
                    { label: "Demorado",   color: "bg-red-100 text-red-700 border-red-200"     };
  return (
    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${color}`}>
      {label}
    </span>
  );
};

export default function VelocidadServicio({ range }: { range: Range }) {
  const [data,    setData]    = useState<DataPoint[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineaVista, setLineaVista] = useState<"tiempo_primer_pedido" | "duracion_sesion">("tiempo_primer_pedido");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/admin/analytics?mode=velocidad_servicio&range=${range}`);
        const json = await res.json();
        setData(json.data      || []);
        setResumen(json.resumen || null);
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    cargar();
  }, [range]);

  const maxLinea    = data.length ? Math.max(...data.map((d) => Math.max(d.tiempo_primer_pedido, d.duracion_sesion))) * 1.25 : 60;
  const maxSesiones = data.length ? Math.max(...data.map((d) => d.sesiones)) * 1.25 : 10;

  return (
    <div className="space-y-6">

      {/* ── KPI CHIPS ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiChip
            icon={Timer}
            label="1er pedido promedio"
            value={`${resumen.timerPrimerPedido} min`}
            color="text-amber-600 bg-amber-50 border-amber-100"
          />
          <KpiChip
            icon={Clock}
            label="Duración promedio"
            value={`${resumen.duracionPromedio} min`}
            color="text-blue-600 bg-blue-50 border-blue-100"
          />
          <KpiChip
            icon={Users}
            label="Total sesiones"
            value={`${resumen.totalSesiones}`}
            color="text-slate-600 bg-slate-50 border-slate-200"
          />
          <KpiChip
            icon={AlertCircle}
            label="Sin pedido"
            value={`${resumen.sesionesSinPedido}`}
            color="text-rose-600 bg-rose-50 border-rose-100"
          />
        </div>
      )}

      {/* ── INTERPRETACIÓN ───────────────────────────────────── */}
      {!loading && resumen && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-slate-400" />
            <span className="text-sm text-slate-500 font-medium">
              Tiempo promedio hasta el primer pedido
            </span>
            <BadgeVelocidad minutos={resumen.timerPrimerPedido} />
          </div>
          {/* Toggle línea */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setLineaVista("tiempo_primer_pedido")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5
                ${lineaVista === "tiempo_primer_pedido"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"}`}
            >
              <Timer size={12} /> 1er pedido
            </button>
            <button
              onClick={() => setLineaVista("duracion_sesion")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5
                ${lineaVista === "duracion_sesion"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"}`}
            >
              <Clock size={12} /> Duración
            </button>
          </div>
        </div>
      )}

      {/* ── GRÁFICO ──────────────────────────────────────────── */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm font-medium">Calculando velocidades...</span>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-300">
          <div className="text-center">
            <Timer size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin datos en este período</p>
          </div>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSesV" x1="0" y1="0" x2="0" y2="1">
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
              <YAxis
                yAxisId="left"
                axisLine={false} tickLine={false} width={40}
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                tickFormatter={(v) => `${v}m`}
                domain={[0, maxLinea]}
              />
              <YAxis
                yAxisId="right" orientation="right"
                axisLine={false} tickLine={false} width={32}
                tick={{ fontSize: 11, fill: "#cbd5e1", fontWeight: 700 }}
                domain={[0, maxSesiones]}
              />
              <Tooltip content={<TooltipVelocidad />} />
              <Bar
                yAxisId="right" dataKey="sesiones"
                fill="url(#gradSesV)" stroke="#e2e8f0" strokeWidth={1}
                radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={600}
              />
              <Line
                yAxisId="left" type="monotone"
                dataKey={lineaVista}
                stroke={lineaVista === "tiempo_primer_pedido" ? "#f59e0b" : "#3b82f6"}
                strokeWidth={3} dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={600}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leyenda */}
      {!loading && data.length > 0 && (
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 rounded-full"
              style={{ backgroundColor: lineaVista === "tiempo_primer_pedido" ? "#f59e0b" : "#3b82f6" }}
            />
            <span className="text-xs font-bold text-slate-400">
              {lineaVista === "tiempo_primer_pedido" ? "Tiempo 1er pedido" : "Duración promedio"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm bg-slate-200 border border-slate-200" />
            <span className="text-xs font-bold text-slate-400">Sesiones</span>
          </div>
        </div>
      )}

      {/* ── REFERENCIA ───────────────────────────────────────── */}
      {!loading && resumen && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Referencia de velocidad de servicio
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Excelente",  rango: "≤ 3 min",  color: "bg-green-100 text-green-700" },
              { label: "Bueno",      rango: "4–6 min",  color: "bg-blue-100 text-blue-700"   },
              { label: "Regular",    rango: "7–10 min", color: "bg-amber-100 text-amber-700" },
              { label: "Demorado",   rango: "> 10 min", color: "bg-red-100 text-red-700"     },
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