"use client";
import { useState, useEffect } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Clock,
  DollarSign,
  Users,
  Zap,
  Loader2,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type Range = "7d" | "4w" | "12m";

interface DataPoint {
  label:       string;
  fecha:       string;
  ticket:      number;
  duracion:    number;
  sesiones:    number;
  totalVentas: number;
}

interface HeatmapPoint {
  hora:     number;
  label:    string;
  sesiones: number;
  ticket:   number;
}

interface Resumen {
  totalSesiones:  number;
  ticketGlobal:   number;
  duracionGlobal: number;
  horaPico:       { label: string; sesiones: number };
}

// ─── TOOLTIP CUSTOM ───────────────────────────────────────────────────────────
const TooltipTicket = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const ticket   = payload.find((p: any) => p.dataKey === "ticket");
  const duracion = payload.find((p: any) => p.dataKey === "duracion");
  const sesiones = payload.find((p: any) => p.dataKey === "sesiones");

  return (
    <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 min-w-[160px] space-y-2">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
        {label}
      </p>
      {ticket && (
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Ticket prom.</p>
          <p className="text-green-400 font-black text-lg leading-none">
            ${Number(ticket.value).toLocaleString("es-AR")}
          </p>
        </div>
      )}
      {duracion && (
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Duración prom.</p>
          <p className="text-blue-400 font-black text-lg leading-none">
            {Number(duracion.value)} min
          </p>
        </div>
      )}
      {sesiones && (
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Sesiones</p>
          <p className="text-slate-300 font-black text-lg leading-none">
            {Number(sesiones.value)}
          </p>
        </div>
      )}
    </div>
  );
};

// ─── HEATMAP DE FRANJAS HORARIAS ──────────────────────────────────────────────
const HeatmapHoras = ({ heatmap }: { heatmap: HeatmapPoint[] }) => {
  const maxSesiones = Math.max(...heatmap.map((h) => h.sesiones), 1);

  const horasRelevantes = [
    ...heatmap.slice(7, 24),
    ...heatmap.slice(0, 3),
  ];

  const BAR_MAX_H = 120; // px altura máxima de barra

  return (
    <div>
      {/* Título + leyenda en la misma línea */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Actividad por franja horaria
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { color: "#f8fafc", border: "#e2e8f0", label: "Sin actividad" },
            { color: "#e2e8f0", label: "Baja" },
            { color: "#94a3b8", label: "Media" },
            { color: "#334155", label: "Alta" },
            { color: "#0f172a", label: "Pico" },
          ].map(({ color, border, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ background: color, border: border ? `1px solid ${border}` : "1px solid #e2e8f0" }}
              />
              <span className="text-[10px] font-bold text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div className="w-full overflow-x-auto pb-2">
        <div
          className="flex items-end gap-1.5 min-w-max px-1"
          style={{ height: `${BAR_MAX_H + 48}px` }}  /* barras + espacio label */
        >
          {horasRelevantes.map((h) => {
            const ratio    = maxSesiones > 0 ? h.sesiones / maxSesiones : 0;
            const esPico   = h.sesiones === maxSesiones && maxSesiones > 0;
            const barH     = Math.max(ratio * BAR_MAX_H, h.sesiones > 0 ? 6 : 3);

            const bg = esPico
              ? "#0f172a"
              : ratio > 0.6 ? "#334155"
              : ratio > 0.3 ? "#94a3b8"
              : ratio > 0   ? "#e2e8f0"
              :               "#f8fafc";

            return (
              <div
                key={h.hora}
                className="flex flex-col items-center gap-2 group relative"
                style={{ width: "36px" }}
              >
                {/* Valor encima de la barra (solo si tiene actividad) */}
                <div style={{ height: `${BAR_MAX_H - barH}px` }} className="flex-shrink-0" />

                {h.sesiones > 0 && (
                  <span
                    className="text-[10px] font-black text-slate-500 absolute"
                    style={{ bottom: `${barH + 48 + 4}px` }}
                  >
                    {h.sesiones}
                  </span>
                )}

                {/* Barra */}
                <div
                  className="w-full rounded-t-lg transition-all duration-500 relative flex-shrink-0"
                  style={{
                    height: `${barH}px`,
                    background: bg,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {esPico && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full shadow-md shadow-red-200" />
                  )}
                </div>

                {/* Etiqueta hora */}
                <span className="text-[11px] font-bold text-slate-400 flex-shrink-0 tabular-nums">
                  {String(h.hora).padStart(2, "0")}h
                </span>

                {/* Tooltip hover */}
                {h.sesiones > 0 && (
                  <div className="absolute bottom-full mb-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                    <span className="text-slate-300">{h.sesiones} ses.</span>
                    {h.ticket > 0 && (
                      <span className="text-green-400 ml-1.5">${h.ticket.toLocaleString()}</span>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function TicketSesiones({ range }: { range: Range }) {
  const [data,    setData]    = useState<DataPoint[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrica, setMetrica] = useState<"ticket" | "duracion">("ticket");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `/api/admin/analytics?mode=ticket_sesiones&range=${range}`
        );
        const json = await res.json();
        setData(json.data       || []);
        setHeatmap(json.heatmap || []);
        setResumen(json.resumen || null);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [range]);

  const maxTicket   = data.length ? Math.max(...data.map((d) => d.ticket),   1) * 1.25 : 100;
  const maxDuracion = data.length ? Math.max(...data.map((d) => d.duracion), 1) * 1.25 : 100;
  const maxSesiones = data.length ? Math.max(...data.map((d) => d.sesiones), 1) * 1.25 : 10;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── CABECERA ──────────────────────────────────────────────── */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-black text-xl text-slate-800 flex items-center gap-2">
              <Clock size={20} className="text-slate-400" />
              Ticket promedio & sesiones
            </h2>
            {!loading && resumen && (
              <p className="text-slate-400 text-sm font-medium mt-1">
                {resumen.totalSesiones} sesiones ·{" "}
                {resumen.duracionGlobal} min promedio · pico a las {resumen.horaPico.label}
              </p>
            )}
          </div>

          {/* Toggle qué línea mostrar */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setMetrica("ticket")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5
                ${metrica === "ticket"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"}`}
            >
              <DollarSign size={12} /> Ticket
            </button>
            <button
              onClick={() => setMetrica("duracion")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5
                ${metrica === "duracion"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"}`}
            >
              <Clock size={12} /> Duración
            </button>
          </div>
        </div>

        {/* ── 4 KPI CHIPS ───────────────────────────────────────── */}
        {!loading && resumen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              {
                icon: DollarSign,
                label: "Ticket promedio",
                value: `$${resumen.ticketGlobal.toLocaleString("es-AR")}`,
                color: "text-green-600 bg-green-50 border-green-100",
              },
              {
                icon: Clock,
                label: "Duración promedio",
                value: `${resumen.duracionGlobal} min`,
                color: "text-blue-600 bg-blue-50 border-blue-100",
              },
              {
                icon: Users,
                label: "Total sesiones",
                value: `${resumen.totalSesiones}`,
                color: "text-slate-600 bg-slate-50 border-slate-200",
              },
              {
                icon: Zap,
                label: "Hora pico",
                value: resumen.horaPico.label,
                color: "text-amber-600 bg-amber-50 border-amber-100",
              },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${color}`}>
                <Icon size={16} className="flex-shrink-0 opacity-70" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider opacity-60">{label}</p>
                  <p className="font-black text-base leading-tight">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse border border-slate-100" />
            ))}
          </div>
        )}
      </div>

      {/* ── GRÁFICO COMPUESTO ─────────────────────────────────────── */}
      <div className="p-6 border-b border-slate-100">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-300">
              <Loader2 size={32} className="animate-spin" />
              <span className="text-sm font-medium">Calculando métricas...</span>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-300">
            <div className="text-center">
              <Clock size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin datos en este período</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSesiones" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#e2e8f0" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#e2e8f0" stopOpacity={0.2} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                  interval={range === "4w" ? 3 : 0}
                />

                {/* Eje izquierdo: ticket o duración */}
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                  tickFormatter={(v) =>
                    metrica === "ticket"
                      ? v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      : `${v}m`
                  }
                  width={52}
                  domain={[0, metrica === "ticket" ? maxTicket : maxDuracion]}
                />

                {/* Eje derecho: sesiones */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#cbd5e1", fontWeight: 700 }}
                  width={36}
                  domain={[0, maxSesiones]}
                />

                <Tooltip content={<TooltipTicket />} />

                {/* Barras de sesiones (fondo, eje derecho) */}
                <Bar
                  yAxisId="right"
                  dataKey="sesiones"
                  fill="url(#gradSesiones)"
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  animationDuration={600}
                />

                {/* Línea principal: ticket o duración */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={metrica}
                  stroke={metrica === "ticket" ? "#10b981" : "#3b82f6"}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={600}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Leyenda manual (más limpia que la de Recharts) */}
        {!loading && data.length > 0 && (
          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-0.5 rounded-full"
                style={{ backgroundColor: metrica === "ticket" ? "#10b981" : "#3b82f6" }}
              />
              <span className="text-xs font-bold text-slate-400">
                {metrica === "ticket" ? "Ticket promedio" : "Duración promedio"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm bg-slate-200 border border-slate-200" />
              <span className="text-xs font-bold text-slate-400">Sesiones</span>
            </div>
          </div>
        )}
      </div>

      {/* ── HEATMAP HORARIO ───────────────────────────────────────── */}
      <div className="p-6">
        {loading ? (
          <div className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
        ) : (
          <HeatmapHoras heatmap={heatmap} />
        )}
      </div>
    </div>
  );
}