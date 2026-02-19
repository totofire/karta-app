"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Eye, RefreshCw, X, Loader2, Receipt } from "lucide-react";
import { SkeletonFilaTabla } from "@/components/Skeletons";

export default function HistorialPage() {
  const [loading, setLoading]                       = useState(true);
  const [loadingDetalle, setLoadingDetalle]         = useState(false);

  const now = new Date();
  const [mes, setMes]                               = useState(now.getMonth() + 1);
  const [anio, setAnio]                             = useState(now.getFullYear());
  const [diaSeleccionado, setDiaSeleccionado]       = useState<number | null>(null);

  const [statsMensuales, setStatsMensuales]         = useState<Record<number, number>>({});
  const [totalMes, setTotalMes]                     = useState(0);

  const [ventas, setVentas]                         = useState<any[]>([]);
  const [meta, setMeta]                             = useState({ page: 1, totalPages: 1, totalRegistros: 0 });
  const [detalleSesion, setDetalleSesion]           = useState<any | null>(null);

  // ── carga inicial (cambia mes/año) ─────────────────────────────────────────
  useEffect(() => {
    const cargarTodo = async () => {
      setLoading(true);
      setDiaSeleccionado(null);

      try {
        const [resCal, resTabla] = await Promise.all([
          fetch(`/api/admin/historial?mode=calendar_stats&month=${mes}&year=${anio}`),
          fetch(`/api/admin/historial?mode=list&page=1&month=${mes}&year=${anio}`),
        ]);

        const dataCal   = await resCal.json();
        const dataTabla = await resTabla.json();

        setStatsMensuales(dataCal.dailyStats || {});
        setTotalMes(dataCal.totalMes || 0);
        setVentas(dataTabla.data || []);
        setMeta(dataTabla.meta || { page: 1, totalPages: 1, totalRegistros: 0 });
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    cargarTodo();
  }, [mes, anio]);

  // ── carga de tabla (día o paginación) ─────────────────────────────────────
  const cargarSoloTabla = (page = 1, dia: number | null = diaSeleccionado) => {
    const urlDia = dia ? `&day=${dia}` : "";
    fetch(`/api/admin/historial?mode=list&page=${page}&month=${mes}&year=${anio}${urlDia}`)
      .then((r) => r.json())
      .then((data) => {
        setVentas(data.data);
        setMeta(data.meta);
      });
  };

  useEffect(() => {
    cargarSoloTabla(1, diaSeleccionado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaSeleccionado]);

  // ── abrir modal con lazy load ──────────────────────────────────────────────
  const abrirDetalle = async (venta: any) => {
    // Mostramos el modal de inmediato con los datos que ya tenemos (nombre, total)
    setDetalleSesion({ ...venta, cargando: true });
    setLoadingDetalle(true);

    try {
      const res  = await fetch(`/api/admin/historial?mode=detalle&sesionId=${venta.id}`);
      const data = await res.json();
      setDetalleSesion({ ...data, cargando: false });
    } catch {
      setDetalleSesion((prev: any) => ({ ...prev, cargando: false }));
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ── calendario ────────────────────────────────────────────────────────────
  const renderCalendario = () => {
    const diasEnMes     = new Date(anio, mes, 0).getDate();
    const primerDiaSem  = new Date(anio, mes - 1, 1).getDay();
    const offset        = primerDiaSem === 0 ? 6 : primerDiaSem - 1;
    const celdas        = [];

    for (let i = 0; i < offset; i++) {
      celdas.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/50 border border-slate-100 hidden md:block" />);
    }

    for (let d = 1; d <= diasEnMes; d++) {
      if (loading) {
        celdas.push(
          <div key={`sk-${d}`} className="h-24 border border-slate-100 p-2 bg-white flex flex-col justify-between">
            <div className="w-6 h-6 bg-slate-100 rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="w-full h-4 bg-slate-100 rounded animate-pulse" />
              <div className="w-1/2 h-3 bg-slate-50 rounded animate-pulse ml-auto" />
            </div>
          </div>
        );
        continue;
      }

      const ventaDia    = statsMensuales[d] || 0;
      const esSel       = diaSeleccionado === d;
      const esHoy       = d === now.getDate() && mes === (now.getMonth() + 1) && anio === now.getFullYear();

      celdas.push(
        <div
          key={d}
          onClick={() => setDiaSeleccionado(esSel ? null : d)}
          className={`
            h-20 md:h-24 border border-slate-200 p-2 cursor-pointer transition-all relative flex flex-col justify-between group
            ${esSel ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-105 z-10 rounded-lg ring-2 ring-offset-2 ring-slate-900" : "bg-white hover:bg-slate-50"}
          `}
        >
          <div className="flex justify-between items-start">
            <span className={`text-xs md:text-sm font-bold ${esSel ? "text-slate-400" : esHoy ? "bg-red-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm shadow-red-200" : "text-slate-400"}`}>
              {d}
            </span>
            {esSel && <div className="bg-green-400 w-1.5 h-1.5 rounded-full animate-pulse" />}
          </div>

          {ventaDia > 0 ? (
            <div className="text-right animate-in fade-in zoom-in duration-300">
              <span className={`block font-black text-sm md:text-lg tracking-tight ${esSel ? "text-green-400" : "text-slate-800"}`}>
                ${(ventaDia / 1000).toFixed(1)}k
              </span>
              <span className={`text-[9px] md:text-[10px] uppercase font-bold tracking-wider block ${esSel ? "text-slate-500" : "text-slate-400"}`}>
                Ventas
              </span>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity">
              <span className="text-2xl text-slate-300">-</span>
            </div>
          )}
        </div>
      );
    }
    return celdas;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <CalendarIcon className="text-slate-400" size={32} />
            HISTORIAL
          </h1>
          <p className="text-slate-500 font-medium mt-1">Resumen contable y calendario de ventas</p>
        </div>

        {/* CONTROLES DE FECHA */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 self-start md:self-auto">
          <button
            disabled={loading}
            onClick={() => { if (mes === 1) { setMes(12); setAnio(anio - 1); } else setMes(mes - 1); }}
            className="p-3 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center px-4 min-w-[140px] relative">
            {loading && <Loader2 className="absolute top-0 right-0 animate-spin text-slate-300" size={14} />}
            <span className="font-black text-slate-800 text-lg uppercase leading-none tracking-tight">
              {new Date(anio, mes - 1).toLocaleString("es-ES", { month: "long" })}
            </span>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="text-xs text-slate-500 bg-transparent outline-none cursor-pointer font-bold mt-0.5 hover:text-slate-800 transition-colors"
            >
              {Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => 2024 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            disabled={loading}
            onClick={() => { if (mes === 12) { setMes(1); setAnio(anio + 1); } else setMes(mes + 1); }}
            className="p-3 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* CALENDARIO */}
      <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200">
          <div className="bg-slate-900 text-white p-6 flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <span className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-1 block">Recaudación Mensual</span>
              {loading ? (
                <div className="h-8 w-32 bg-slate-800 rounded animate-pulse" />
              ) : (
                <span className="font-black text-3xl md:text-4xl text-green-400 tracking-tight">
                  ${totalMes.toLocaleString()}
                </span>
              )}
            </div>
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          </div>

          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"].map((d) => (
              <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 tracking-wider">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">{renderCalendario()}</div>
        </div>
      </div>

      {/* TABLA */}
      <div className={`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 ${loading ? "opacity-70 pointer-events-none grayscale" : ""}`}>
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
              {diaSeleccionado ? (
                <><span className="bg-slate-800 text-white px-2 py-0.5 rounded text-sm">DÍA {diaSeleccionado}</span><span>Detalle Diario</span></>
              ) : (
                <><RefreshCw size={20} className="text-slate-400" /><span>Movimientos del Mes</span></>
              )}
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {diaSeleccionado
                ? `Mostrando ventas del ${diaSeleccionado}/${mes}/${anio}`
                : `${new Date(anio, mes - 1).toLocaleString("es-ES", { month: "long" })} · ${meta.totalRegistros} registros`}
            </p>
          </div>

          {diaSeleccionado && (
            <button
              onClick={() => setDiaSeleccionado(null)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
            >
              <X size={16} /> Ver Mes Completo
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-4 pl-6">Fecha y Hora</th>
                <th className="p-4">Mesa</th>
                <th className="p-4">Pedidos</th>
                <th className="p-4 text-right">Total Cobrado</th>
                <th className="p-4 pr-6 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={5} className="p-0"><SkeletonFilaTabla /></td></tr>
                ))
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Receipt size={24} className="opacity-50" />
                      </div>
                      <p className="font-medium">No hay ventas registradas en este período.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 pl-6 text-sm font-medium text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-bold text-slate-500 border border-slate-200">
                          {new Date(venta.fechaFin).getDate()} / {new Date(venta.fechaFin).getMonth() + 1}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {new Date(venta.fechaFin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{venta.mesa.nombre}</td>
                    <td className="p-4 text-sm text-slate-500">
                      {/* Ahora usamos pedidoCount en lugar de pedidos.length */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100">
                        <Receipt size={12} />
                        {venta.pedidoCount} pedidos
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-slate-800 text-lg">
                      ${venta.totalVenta.toLocaleString()}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => abrirDetalle(venta)}
                        className="p-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg text-slate-400 hover:text-slate-800 transition-all shadow-sm group-hover:shadow-md"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center items-center gap-4">
          <button
            disabled={meta.page === 1}
            onClick={() => cargarSoloTabla(meta.page - 1)}
            className="p-2 disabled:opacity-30 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Página {meta.page} <span className="text-slate-300 font-normal">de</span> {meta.totalPages}
          </span>
          <button
            disabled={meta.page >= meta.totalPages}
            onClick={() => cargarSoloTabla(meta.page + 1)}
            className="p-2 disabled:opacity-30 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* MODAL DETALLE */}
      {detalleSesion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">

            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg">Ticket #{detalleSesion.id}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{detalleSesion.mesa?.nombre}</span>
                  <span>•</span>
                  <span>{detalleSesion.fechaFin ? new Date(detalleSesion.fechaFin).toLocaleString() : "—"}</span>
                </p>
              </div>
              <button onClick={() => setDetalleSesion(null)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo: loading o items */}
            {detalleSesion.cargando ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-slate-400" size={32} />
              </div>
            ) : (
              <div className="p-6 overflow-y-auto bg-slate-50 space-y-4 flex-1">
                {(detalleSesion.pedidos ?? [])
                  .flatMap((p: any) => p.items)
                  .map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start border-b border-dashed border-slate-200 pb-3 last:border-0 last:pb-0">
                      <div className="flex gap-3">
                        <span className="bg-white border border-slate-200 font-bold text-slate-600 text-xs w-6 h-6 flex items-center justify-center rounded shadow-sm">
                          {item.cantidad}
                        </span>
                        <div>
                          <span className="text-slate-800 text-sm font-bold block leading-tight">{item.producto.nombre}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium tracking-wide">${item.precio} un.</span>
                        </div>
                      </div>
                      <span className="text-slate-900 font-bold text-sm">${(item.precio * item.cantidad).toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="p-5 bg-white border-t border-slate-200 flex justify-between items-center shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <span className="text-slate-400 font-bold uppercase text-xs tracking-wider">Total Cobrado</span>
              <span className="text-3xl font-black text-slate-900 tracking-tight">${detalleSesion.totalVenta?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}