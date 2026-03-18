"use client";
import { useState, useEffect } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  BarChart,
} from "recharts";
import {
  RefreshCw, Armchair, Clock, TrendingUp, Loader2,
  Trophy, AlertTriangle, Zap,
} from "lucide-react";

type Range = "7d" | "4w" | "12m";

/* ── Tipos ──────────────────────────────────────────────────────── */

interface MesaRotacion {
  mesaId:            number;
  nombre:            string;
  sector:            string | null;
  sesiones:          number;
  diasActivos:       number;
  rotacionDiaria:    number;   // sesiones / días en el período
  duracionPromedio:  number;   // min promedio por sesión
  ticketPromedio:    number;
  ingresoDiario:     number;   // rotacion × ticket
}

interface TendenciaPunto {
  label:          string;
  sesiones:       number;
  mesasActivas:   number;
  rotacion:       number;   // sesiones / mesas activas ese día
}

interface Resumen {
  rotacionGlobal:    number;
  duracionGlobal:    number;
  mejorMesa:         { nombre: string; rotacion: number } | null;
  ingresoDiarioGlobal: number;
  totalMesasActivas: number;
  diasEnPeriodo:     number;
}

type Metrica = "rotacionDiaria" | "duracionPromedio" | "ingresoDiario";

const METRICAS: { key: Metrica; label: string; fmt: (v: number) => string }[] = [
  { key: "rotacionDiaria",   label: "Rotación/día",   fmt: (v) => `${v.toFixed(1)}x` },
  { key: "ingresoDiario",    label: "Ingreso/día",     fmt: (v) => `$${Math.round(v).toLocaleString("es-AR")}` },
  { key: "duracionPromedio", label: "Duración prom.",   fmt: (v) => `${Math.round(v)} min` },
];

const COLORES_BARRA = [
  "#0f172a", "#1e293b", "#334155", "#475569",
  "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0",
];

/* ── Tooltip barras por mesa ────────────────────────────────────── */

const TooltipMesa = ({ active, payload, label, metrica }: any) => {
  if (!active || !payload?.length) return null;
  const d: MesaRotacion = payload[0].payload;
  const m = METRICAS.find((x) => x.key === metrica)!;
  return (
    <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 min-w-[180px] space-y-1.5">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest truncate max-w-[160px]">
        {d.nombre}
        {d.sector && <span className="text-slate-500 ml-1">· {d.sector}</span>}
      </p>
      <p className="text-white font-black text-xl leading-none">{m.fmt(d[metrica as Metrica])}</p>
      <div className="border-t border-slate-700 pt-1.5 space-y-0.5">
        <p className="text-slate-400 text-[10px] font-bold">
          {d.sesiones} sesiones en {d.diasActivos} días activos
        </p>
        <p className="text-slate-400 text-[10px] font-bold">
          Ticket prom. ${d.ticketPromedio.toLocaleString("es-AR")}
        </p>
      </div>
    </div>
  );
};

/* ── Tooltip tendencia diaria ───────────────────────────────────── */

const TooltipTendencia = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const rotacion = payload.find((p: any) => p.dataKey === "rotacion");
  const sesiones = payload.find((p: any) => p.dataKey === "sesiones");
  const mesas    = payload.find((p: any) => p.dataKey === "mesasActivas");
  return (
    <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 min-w-[160px] space-y-2">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p>
      {rotacion && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase">Rotación</p>
          <p className="text-amber-400 font-black text-lg leading-none">
            {Number(rotacion.value).toFixed(1)}x
          </p>
        </div>
      )}
      {sesiones && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase">Sesiones</p>
          <p className="text-slate-300 font-black text-lg leading-none">{sesiones.value}</p>
        </div>
      )}
      {mesas && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase">Mesas usadas</p>
          <p className="text-slate-400 font-black text-lg leading-none">{mesas.value}</p>
        </div>
      )}
    </div>
  );
};

/* ── Badge semáforo ─────────────────────────────────────────────── */

const BadgeRotacion = ({ rotacion }: { rotacion: number }) => {
  const { label, color } =
    rotacion >= 3   ? { label: "Alta",     color: "bg-green-100 text-green-700 border-green-200" } :
    rotacion >= 2   ? { label: "Buena",    color: "bg-blue-100 text-blue-700 border-blue-200"   } :
    rotacion >= 1   ? { label: "Normal",   color: "bg-amber-100 text-amber-700 border-amber-200" } :
                      { label: "Baja",     color: "bg-red-100 text-red-700 border-red-200"       };
  return (
    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${color}`}>
      {label}
    </span>
  );
};

/* ── KPI chip ───────────────────────────────────────────────────── */

const KpiChip = ({
  icon: Icon, label, value, sub, color,
}: { icon: any; label: string; value: string; sub?: string; color: string }) => (
  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${color}`}>
    <Icon size={16} className="flex-shrink-0 opacity-70" />
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider opacity-60">{label}</p>
      <p className="font-black text-base leading-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-50 font-medium">{sub}</p>}
    </div>
  </div>
);

/* ── Componente principal ───────────────────────────────────────── */

export default function RotacionMesas({ range }: { range: Range }) {
  const [mesas,      setMesas]      = useState<MesaRotacion[]>([]);
  const [tendencia,  setTendencia]  = useState<TendenciaPunto[]>([]);
  const [resumen,    setResumen]    = useState<Resumen | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [metrica,    setMetrica]    = useState<Metrica>("rotacionDiaria");
  const [vista,      setVista]      = useState<"ranking" | "tendencia" | "tabla">("ranking");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/admin/analytics?mode=rotacion_mesas&range=${range}`);
        const json = await res.json();
        setMesas(json.mesas         || []);
        setTendencia(json.tendencia || []);
        setResumen(json.resumen     || null);
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    cargar();
  }, [range]);

  const mesasOrdenadas = [...mesas].sort((a, b) => b[metrica] - a[metrica]);

  return (
    <div className="space-y-6">

      {/* ── KPI CHIPS ──────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiChip
            icon={RefreshCw}
            label="Rotación global"
            value={`${resumen.rotacionGlobal.toFixed(1)}x`}
            sub="ses/mesa/día"
            color="text-amber-600 bg-amber-50 border-amber-100"
          />
          <KpiChip
            icon={Clock}
            label="Duración promedio"
            value={`${resumen.duracionGlobal} min`}
            sub="por sesión"
            color="text-blue-600 bg-blue-50 border-blue-100"
          />
          <KpiChip
            icon={TrendingUp}
            label="Ingreso diario/mesa"
            value={`$${resumen.ingresoDiarioGlobal.toLocaleString("es-AR")}`}
            sub="promedio"
            color="text-green-600 bg-green-50 border-green-100"
          />
          <KpiChip
            icon={Armchair}
            label="Mesas activas"
            value={`${resumen.totalMesasActivas}`}
            sub={`de ${mesas.length} totales`}
            color="text-slate-600 bg-slate-50 border-slate-200"
          />
        </div>
      )}

      {/* ── CABECERA: Semáforo + Controles ─────────────────────── */}
      {!loading && resumen && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <RefreshCw size={16} className="text-slate-400" />
            <span className="text-sm text-slate-500 font-medium">Rotación promedio</span>
            <BadgeRotacion rotacion={resumen.rotacionGlobal} />
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Selector de métrica (para ranking y tabla) */}
            {vista !== "tendencia" && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
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
            )}

            {/* Selector de vista */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
              {(["ranking", "tendencia", "tabla"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all capitalize
                    ${vista === v
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                      : "text-slate-400 hover:text-slate-600"}`}
                >
                  {v === "ranking" ? "Ranking" : v === "tendencia" ? "Tendencia" : "Tabla"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LOADING ────────────────────────────────────────────── */}
      {loading && (
        <div className="h-72 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm font-medium">Calculando rotación...</span>
          </div>
        </div>
      )}

      {/* ── SIN DATOS ──────────────────────────────────────────── */}
      {!loading && mesas.length === 0 && (
        <div className="h-72 flex items-center justify-center text-slate-300">
          <div className="text-center">
            <Armchair size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin datos en este período</p>
          </div>
        </div>
      )}

      {/* ── CONTENIDO ──────────────────────────────────────────── */}
      {!loading && mesas.length > 0 && (
        <>
          {/* Mesa estrella */}
          {resumen?.mejorMesa && vista === "ranking" && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Trophy size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Mayor rotación
                </p>
                <p className="font-black text-slate-900 text-lg leading-tight">
                  {resumen.mejorMesa.nombre}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-black text-slate-900 text-xl leading-tight">
                  {resumen.mejorMesa.rotacion.toFixed(1)}x
                </p>
                <p className="text-[10px] text-slate-400 font-bold">ses/día</p>
              </div>
            </div>
          )}

          {/* ── VISTA: RANKING (gráfico horizontal) ──────────────── */}
          {vista === "ranking" && (
            <div style={{ height: `${Math.max(mesasOrdenadas.length * 48, 200)}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mesasOrdenadas}
                  layout="vertical"
                  margin={{ top: 0, right: 70, left: 0, bottom: 0 }}
                  barSize={28}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                    tickFormatter={(v: any) => {
                      const val = Number(v) || 0;
                      return metrica === "rotacionDiaria"
                        ? `${val.toFixed(1)}x`
                        : metrica === "ingresoDiario"
                          ? val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${Math.round(val)}`
                          : `${Math.round(val)}m`;
                    }}
                  />
                  <YAxis
                    type="category" dataKey="nombre"
                    axisLine={false} tickLine={false} width={70}
                    tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }}
                  />
                  <Tooltip
                    content={(props) => <TooltipMesa {...props} metrica={metrica} />}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar
                    dataKey={metrica}
                    radius={[0, 6, 6, 0]}
                    animationDuration={600}
                    label={{
                      position: "right",
                      fontSize: 11,
                      fontWeight: 700,
                      fill: "#94a3b8",
                      formatter: (v: any) => {
                        const val = Number(v) || 0;
                        const m = METRICAS.find((x) => x.key === metrica)!;
                        return m.fmt(val);
                      },
                    }}
                  >
                    {mesasOrdenadas.map((_, i) => (
                      <Cell key={i} fill={COLORES_BARRA[Math.min(i, COLORES_BARRA.length - 1)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── VISTA: TENDENCIA (línea + barras) ────────────────── */}
          {vista === "tendencia" && tendencia.length > 0 && (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={tendencia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSesRot" x1="0" y1="0" x2="0" y2="1">
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
                      yAxisId="left" axisLine={false} tickLine={false} width={40}
                      tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                      tickFormatter={(v) => `${Number(v).toFixed(1)}x`}
                      domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3 * 10) / 10]}
                    />
                    <YAxis
                      yAxisId="right" orientation="right"
                      axisLine={false} tickLine={false} width={32}
                      tick={{ fontSize: 11, fill: "#cbd5e1", fontWeight: 700 }}
                    />
                    <Tooltip content={<TooltipTendencia />} />
                    <Bar
                      yAxisId="right" dataKey="sesiones"
                      fill="url(#gradSesRot)" stroke="#e2e8f0" strokeWidth={1}
                      radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={600}
                    />
                    <Line
                      yAxisId="left" type="monotone" dataKey="rotacion"
                      stroke="#f59e0b" strokeWidth={3} dot={false}
                      activeDot={{ r: 6, strokeWidth: 0, fill: "#f59e0b" }}
                      animationDuration={600}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-400">Rotación (ses/mesa)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded-sm bg-slate-200 border border-slate-200" />
                  <span className="text-xs font-bold text-slate-400">Sesiones totales</span>
                </div>
              </div>
            </>
          )}

          {/* ── VISTA: TABLA ─────────────────────────────────────── */}
          {vista === "tabla" && (
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                  <tr>
                    <th className="p-3 pl-5">#</th>
                    <th className="p-3">Mesa</th>
                    <th className="p-3 text-right">Rotación</th>
                    <th className="p-3 text-right">Sesiones</th>
                    <th className="p-3 text-right hidden md:table-cell">Días activos</th>
                    <th className="p-3 text-right">Duración</th>
                    <th className="p-3 text-right hidden lg:table-cell">Ticket prom.</th>
                    <th className="p-3 pr-5 text-right">Ingreso/día</th>
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
                        <span className={`font-black text-sm ${
                          m.rotacionDiaria >= 3 ? "text-green-600" :
                          m.rotacionDiaria >= 2 ? "text-blue-600"  :
                          m.rotacionDiaria >= 1 ? "text-amber-600" :
                          "text-red-500"
                        }`}>
                          {m.rotacionDiaria.toFixed(1)}x
                        </span>
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-slate-600">
                        {m.sesiones}
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-slate-500 hidden md:table-cell">
                        {m.diasActivos}
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-slate-500">
                        {Math.round(m.duracionPromedio)} min
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-slate-600 hidden lg:table-cell">
                        ${m.ticketPromedio.toLocaleString("es-AR")}
                      </td>
                      <td className="p-3 pr-5 text-right font-black text-slate-900 text-sm">
                        ${Math.round(m.ingresoDiario).toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── INSIGHT CONTEXTUAL ─────────────────────────────── */}
          {resumen && (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start gap-3">
                <Zap
                  size={16}
                  className={`flex-shrink-0 mt-0.5 ${
                    resumen.rotacionGlobal >= 2 ? "text-green-500" : "text-amber-500"
                  }`}
                />
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  {resumen.rotacionGlobal >= 3
                    ? `Rotación alta (${resumen.rotacionGlobal.toFixed(1)}x). Las mesas se usan más de 3 veces por día en promedio. Cada mesa genera ~$${resumen.ingresoDiarioGlobal.toLocaleString("es-AR")}/día.`
                    : resumen.rotacionGlobal >= 2
                      ? `Rotación buena (${resumen.rotacionGlobal.toFixed(1)}x). Hay margen para mejorar acortando la duración promedio de sesión (${resumen.duracionGlobal} min). Cada mesa genera ~$${resumen.ingresoDiarioGlobal.toLocaleString("es-AR")}/día.`
                      : resumen.rotacionGlobal >= 1
                        ? `Rotación normal (${resumen.rotacionGlobal.toFixed(1)}x). Las sesiones duran ${resumen.duracionGlobal} min en promedio — reducir tiempos de espera podría aumentar la rotación y el ingreso diario por mesa.`
                        : `Rotación baja (${resumen.rotacionGlobal.toFixed(1)}x). Puede haber mesas ociosas o sesiones muy largas (${resumen.duracionGlobal} min promedio). Revisar distribución de mesas y flujo de servicio.`
                  }
                </p>
              </div>
            </div>
          )}

          {/* ── REFERENCIA ─────────────────────────────────────── */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Referencia de rotación de mesas
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Alta",    rango: "≥ 3x/día",   color: "bg-green-100 text-green-700" },
                { label: "Buena",   rango: "2–3x/día",   color: "bg-blue-100 text-blue-700"   },
                { label: "Normal",  rango: "1–2x/día",   color: "bg-amber-100 text-amber-700" },
                { label: "Baja",    rango: "< 1x/día",   color: "bg-red-100 text-red-700"     },
              ].map(({ label, rango, color }) => (
                <div key={label} className={`px-3 py-2 rounded-xl ${color} text-center`}>
                  <p className="font-black text-xs">{label}</p>
                  <p className="text-[10px] font-bold opacity-70">{rango}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}