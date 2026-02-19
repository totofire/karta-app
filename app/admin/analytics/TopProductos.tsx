"use client";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { UtensilsCrossed, DollarSign, Hash, Loader2, Trophy } from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type Range    = "7d" | "4w" | "12m";
type Metrica  = "unidades" | "ingresos";

interface Producto {
  rank:        number;
  productoId:  number;
  nombre:      string;
  categoria:   string;
  unidades:    number;
  ingresos:    number;
  precioProm:  number;
  pctUnidades: number;
  pctIngresos: number;
}

interface Resumen {
  totalUnidades:           number;
  totalIngresos:           number;
  totalProductosDistintos: number;
  topProducto:             Producto | null;
}

// ─── TOOLTIP CUSTOM ───────────────────────────────────────────────────────────
const TooltipProducto = ({ active, payload, metrica }: any) => {
  if (!active || !payload?.length) return null;
  const d: Producto = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700 min-w-[180px]">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 truncate max-w-[160px]">
        {d.nombre}
      </p>
      <p className="text-green-400 font-black text-xl leading-none">
        {metrica === "unidades"
          ? `${d.unidades} un.`
          : `$${d.ingresos.toLocaleString("es-AR")}`}
      </p>
      <p className="text-slate-400 text-xs font-bold mt-1.5 border-t border-slate-700 pt-1.5">
        {metrica === "unidades"
          ? `$${d.ingresos.toLocaleString("es-AR")} en ingresos`
          : `${d.unidades} unidades vendidas`}
      </p>
      <p className="text-slate-500 text-[10px] font-bold mt-0.5">{d.categoria}</p>
    </div>
  );
};

// ─── BARRA DE PROGRESO ────────────────────────────────────────────────────────
const ProgressBar = ({ pct, color }: { pct: number; color: string }) => (
  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{ width: `${pct}%`, backgroundColor: color }}
    />
  </div>
);

// ─── COLORES PARA LAS BARRAS ──────────────────────────────────────────────────
const COLORES = [
  "#0f172a", "#1e293b", "#334155", "#475569",
  "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0",
];

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function TopProductos({ range }: { range: Range }) {
  const [productos,   setProductos]   = useState<Producto[]>([]);
  const [resumen,     setResumen]     = useState<Resumen | null>(null);
  const [categorias,  setCategorias]  = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [metrica,     setMetrica]     = useState<Metrica>("unidades");
  const [catFiltro,   setCatFiltro]   = useState<string>("Todas");
  const [vista,       setVista]       = useState<"grafico" | "tabla">("grafico");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `/api/admin/analytics?mode=top_productos&range=${range}`
        );
        const json = await res.json();
        setProductos(json.productos   || []);
        setResumen(json.resumen       || null);
        setCategorias(["Todas", ...(json.categorias || [])]);
        setCatFiltro("Todas");
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [range]);

  // Filtrado por categoría + top 10 para el gráfico
  const productosFiltrados = productos
    .filter((p) => catFiltro === "Todas" || p.categoria === catFiltro)
    .slice(0, 10);

  // Reordenar según la métrica activa
  const productosOrdenados = [...productosFiltrados].sort(
    (a, b) => b[metrica] - a[metrica]
  );

  const maxValor = productosOrdenados.length
    ? productosOrdenados[0][metrica]
    : 1;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── CABECERA ──────────────────────────────────────────────── */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-black text-xl text-slate-800 flex items-center gap-2">
              <UtensilsCrossed size={20} className="text-slate-400" />
              Productos más vendidos
            </h2>
            {!loading && resumen && (
              <p className="text-slate-400 text-sm font-medium mt-1">
                {resumen.totalProductosDistintos} productos distintos ·{" "}
                {resumen.totalUnidades.toLocaleString("es-AR")} unidades totales
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Toggle métrica */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setMetrica("unidades")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5
                  ${metrica === "unidades"
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                    : "text-slate-400 hover:text-slate-600"}`}
              >
                <Hash size={12} /> Unidades
              </button>
              <button
                onClick={() => setMetrica("ingresos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5
                  ${metrica === "ingresos"
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                    : "text-slate-400 hover:text-slate-600"}`}
              >
                <DollarSign size={12} /> Ingresos
              </button>
            </div>

            {/* Toggle vista */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setVista("grafico")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all
                  ${vista === "grafico"
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                    : "text-slate-400 hover:text-slate-600"}`}
              >
                Gráfico
              </button>
              <button
                onClick={() => setVista("tabla")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all
                  ${vista === "tabla"
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                    : "text-slate-400 hover:text-slate-600"}`}
              >
                Tabla
              </button>
            </div>
          </div>
        </div>

        {/* Filtro de categorías */}
        {!loading && categorias.length > 2 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFiltro(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all border
                  ${catFiltro === cat
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CUERPO ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="h-72 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm font-medium">Cargando productos...</span>
          </div>
        </div>

      ) : productosOrdenados.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-slate-300">
          <div className="text-center">
            <UtensilsCrossed size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin datos en este período</p>
          </div>
        </div>

      ) : vista === "grafico" ? (
        /* ── GRÁFICO HORIZONTAL ─────────────────────────────────── */
        <div className="p-6">
          <div style={{ height: `${Math.max(productosOrdenados.length * 52, 200)}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productosOrdenados}
                layout="vertical"
                margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                barSize={28}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                  tickFormatter={(v) =>
                    metrica === "ingresos"
                      ? v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      : `${v}`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#475569", fontWeight: 700 }}
                  width={140}
                  tickFormatter={(v) =>
                    v.length > 18 ? `${v.slice(0, 16)}…` : v
                  }
                />
                <Tooltip
                  content={(props) => (
                    <TooltipProducto {...props} metrica={metrica} />
                  )}
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
                      return metrica === "ingresos"
                        ? `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                        : `${val}`;
                    },
                  }}
                >
                  {productosOrdenados.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORES[Math.min(i, COLORES.length - 1)]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      ) : (
        /* ── TABLA DETALLADA ────────────────────────────────────── */
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <tr>
                <th className="p-3 pl-6 w-8">#</th>
                <th className="p-3">Producto</th>
                <th className="p-3 hidden md:table-cell">Categoría</th>
                <th className="p-3 text-right">Unidades</th>
                <th className="p-3 text-right">Ingresos</th>
                <th className="p-3 pr-6 text-right hidden lg:table-cell">% Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {productosOrdenados.map((p) => (
                <tr key={p.productoId} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-3 pl-6">
                    {p.rank === 1 ? (
                      <Trophy size={16} className="text-amber-400" />
                    ) : (
                      <span className="text-xs font-black text-slate-300">
                        {p.rank}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{p.nombre}</p>
                      <ProgressBar
                        pct={metrica === "unidades" ? p.pctUnidades : p.pctIngresos}
                        color={COLORES[Math.min((p.rank || 1) - 1, COLORES.length - 1)]}
                      />
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                      {p.categoria}
                    </span>
                  </td>
                  <td className="p-3 text-right font-black text-slate-800 text-sm">
                    {p.unidades.toLocaleString("es-AR")}
                    <span className="text-slate-300 font-normal text-xs ml-1">un</span>
                  </td>
                  <td className="p-3 text-right font-black text-slate-800 text-sm">
                    ${p.ingresos.toLocaleString("es-AR")}
                  </td>
                  <td className="p-3 pr-6 text-right hidden lg:table-cell">
                    <span className="text-xs font-black text-slate-400">
                      {metrica === "unidades" ? p.pctUnidades : p.pctIngresos}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FOOTER — producto estrella ───────────────────────────── */}
      {!loading && resumen?.topProducto && (
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Trophy size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Producto estrella
              </p>
              <p className="font-black text-slate-800 text-sm leading-tight">
                {resumen.topProducto.nombre}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-slate-900">
              {resumen.topProducto.unidades} unidades
            </p>
            <p className="text-xs text-slate-400 font-bold">
              ${resumen.topProducto.ingresos.toLocaleString("es-AR")} generados
            </p>
          </div>
        </div>
      )}
    </div>
  );
}