"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Armchair, TrendingUp, Clock, Loader2, Trophy } from "lucide-react";

type Range = "7d" | "4w" | "12m";

interface MesaData {
  mesaId:            number;
  nombre:            string;
  sector:            string | null;
  sesiones:          number;
  ingresos:          number;
  ticket_promedio:   number;
  duracion_promedio: number;
  participacion:     number;
}

interface Resumen {
  totalIngresos: number;
  totalSesiones: number;
}

type Metrica = "ingresos" | "sesiones" | "ticket_promedio" | "duracion_promedio";

const METRICAS: { key: Metrica; label: string; fmt: (v: number) => string }[] = [
  { key: "ingresos",          label: "Ingresos",      fmt: (v) => `$${v.toLocaleString("es-AR")}` },
  { key: "sesiones",          label: "Sesiones",      fmt: (v) => `${v}` },
  { key: "ticket_promedio",   label: "Ticket prom.",  fmt: (v) => `$${v.toLocaleString("es-AR")}` },
  { key: "duracion_promedio", label: "Duración prom.", fmt: (v) => `${v} min` },
];

const TooltipMesa = ({ active, payload, label, metrica }: any) => {
  if (!active || !payload?.length) return null;
  const m = METRICAS.find((x) => x.key === metrica)!;
  return (
    <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 min-w-[140px]">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-white font-black text-xl leading-none">{m.fmt(payload[0].value)}</p>
      <p className="text-slate-400 text-xs mt-1">{m.label}</p>
    </div>
  );
};

export default function RendimientoMesas({ range }: { range: Range }) {
  const [data,    setData]    = useState<MesaData[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrica, setMetrica] = useState<Metrica>("ingresos");
  const [vista,   setVista]   = useState<"grafico" | "tabla">("grafico");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/admin/analytics?mode=rendimiento_mesas&range=${range}`);
        const json = await res.json();
        setData(json.data      || []);
        setResumen(json.resumen || null);
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    cargar();
  }, [range]);

  const metricaObj = METRICAS.find((m) => m.key === metrica)!;

  // Colores: más activa = más oscura
  const getColor = (index: number, total: number) => {
    const levels = ["#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];
    const idx = Math.min(index, levels.length - 1);
    return levels[idx];
  };

  const mesasOrdenadas = [...data].sort((a, b) => b[metrica] - a[metrica]);
  const topMesa = mesasOrdenadas[0];

  return (
    <div className="space-y-6">

      {/* ── CONTROLES ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">

        {/* Selector de métrica */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl overflow-x-auto">
          {METRICAS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMetrica(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap
                ${metrica === key
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Vista gráfico/tabla */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
          {(["grafico", "tabla"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all capitalize
                ${vista === v
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"}`}
            >
              {v === "grafico" ? "Gráfico" : "Tabla"}
            </button>
          ))}
        </div>
      </div>

      {/* ── LOADING ──────────────────────────────────────────── */}
      {loading && (
        <div className="h-72 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm font-medium">Calculando rendimiento...</span>
          </div>
        </div>
      )}

      {/* ── SIN DATOS ────────────────────────────────────────── */}
      {!loading && data.length === 0 && (
        <div className="h-72 flex items-center justify-center text-slate-300">
          <div className="text-center">
            <Armchair size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin datos en este período</p>
          </div>
        </div>
      )}

      {/* ── CONTENIDO ────────────────────────────────────────── */}
      {!loading && data.length > 0 && (
        <>
          {/* KPI de la mesa top */}
          {topMesa && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Trophy size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa estrella</p>
                <p className="font-black text-slate-900 text-lg leading-tight">
                  {topMesa.nombre}
                  {topMesa.sector && (
                    <span className="text-sm font-medium text-slate-400 ml-2">{topMesa.sector}</span>
                  )}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-black text-slate-900 text-xl leading-tight">
                  {metricaObj.fmt(topMesa[metrica])}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">{metricaObj.label}</p>
              </div>
            </div>
          )}

          {/* GRÁFICO */}
          {vista === "grafico" && (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mesasOrdenadas}
                  layout="vertical"
                  margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                    tickFormatter={(v) =>
                      metrica === "ingresos" || metrica === "ticket_promedio"
                        ? v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`
                        : metrica === "duracion_promedio" ? `${v}m` : `${v}`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    axisLine={false} tickLine={false}
                    width={60}
                    tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }}
                  />
                  <Tooltip content={(props) => <TooltipMesa {...props} metrica={metrica} />} />
                  <Bar dataKey={metrica} radius={[0, 6, 6, 0]} maxBarSize={32} animationDuration={600}>
                    {mesasOrdenadas.map((_, i) => (
                      <Cell key={i} fill={getColor(i, mesasOrdenadas.length)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* TABLA */}
          {vista === "tabla" && (
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                  <tr>
                    <th className="p-3 pl-5">#</th>
                    <th className="p-3">Mesa</th>
                    <th className="p-3 text-right">Ingresos</th>
                    <th className="p-3 text-right">Sesiones</th>
                    <th className="p-3 text-right">Ticket prom.</th>
                    <th className="p-3 pr-5 text-right">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mesasOrdenadas.map((m, i) => (
                    <tr key={m.mesaId} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 pl-5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                          ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-black text-slate-800 text-sm">{m.nombre}</p>
                        {m.sector && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{m.sector}</p>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <p className="font-black text-slate-900 text-sm">
                          ${m.ingresos.toLocaleString("es-AR")}
                        </p>
                        {/* Barra de participación */}
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-800 rounded-full"
                              style={{ width: `${m.participacion}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">{m.participacion}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-slate-600">{m.sesiones}</td>
                      <td className="p-3 text-right text-sm font-bold text-slate-600">
                        ${m.ticket_promedio.toLocaleString("es-AR")}
                      </td>
                      <td className="p-3 pr-5 text-right text-sm font-bold text-slate-400">
                        {m.duracion_promedio} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}