"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Loader2,
  Utensils,
  LogOut,
  Clock,
  Flame,
  GlassWater,
  ChefHat,
  HandCoins,
  Receipt,
  X,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Trash2,
  PlusCircle,
  AlertCircle,
  BellRing,
  Check,
  Link2,
  Link2Off,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { audioManager } from "@/lib/audio";
import MozoListener from "@/components/MozoListener";
import NotificationsManager from "@/components/NotificationsManager";

type TipoPedido = "cocina" | "barra" | "ambos";
type MetodoPago = "QR" | "TARJETA" | "EFECTIVO";
type Tab = "ocupadas" | "libres";

/* ── Reloj de mesa ────────────────────────────────────────── */
const TiempoMesa = ({ fecha }: { fecha: string }) => {
  const [minutos, setMinutos] = useState(0);
  useEffect(() => {
    const calc = () =>
      setMinutos(Math.floor((Date.now() - new Date(fecha).getTime()) / 60000));
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [fecha]);

  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  const urgente = minutos > 90;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-bold tabular-nums ${
        urgente ? "text-red-500" : "text-slate-400"
      }`}
    >
      <Clock size={11} />
      {h > 0 ? `${h}h ${m}m` : `${minutos}m`}
    </span>
  );
};

/* ── Chip de estado ───────────────────────────────────────── */
const ChipListo = ({ tipo }: { tipo: TipoPedido }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide
    ${tipo === "barra" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}
  >
    {tipo === "barra" ? <GlassWater size={9} /> : tipo === "ambos" ? <ChefHat size={9} /> : <Flame size={9} />}
    {tipo === "barra" ? "Bebida lista" : tipo === "ambos" ? "Todo listo" : "Plato listo"}
  </span>
);

/* ── Fetcher SWR ──────────────────────────────────────────── */
const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) =>
    r.ok ? r.json() : { mesas: [], localId: null },
  );

/* ══════════════════════════════════════════════════════════ */
export default function PanelMozo() {
  const router = useRouter();

  // ── SWR ─────────────────────────────────────────────────
  const { data, mutate, isLoading } = useSWR("/api/mozo/mesas", fetcher, {
    revalidateOnFocus: true,
  });
  const mesas: any[]        = data?.mesas   ?? [];
  const localId: number | null = data?.localId ?? null;

  // Ref estable para mutate (usado dentro de callbacks de WebSocket)
  const mutateRef = useRef(mutate);
  useEffect(() => { mutateRef.current = mutate; }, [mutate]);

  // Reconexión al volver online → manejado por useRealtimeReconnect en MozoListener

  // ── Estado UI ───────────────────────────────────────────
  const [abriendo, setAbriendo]         = useState<number | null>(null);
  const [pidiendoCuenta, setPidiendoCuenta] = useState<number | null>(null);
  const [pedidosListos, setPedidosListos]   = useState<Map<number, TipoPedido>>(new Map());
  const [tab, setTab]                   = useState<Tab>("ocupadas");
  const [modalCuenta, setModalCuenta]   = useState<{ mesa: any; metodo: MetodoPago | null } | null>(null);
  const [modalDetalle, setModalDetalle] = useState<{ mesa: any } | null>(null);
  const [detalleSesion, setDetalleSesion] = useState<any | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cancelandoItem, setCancelandoItem] = useState<Set<number>>(new Set());
  const [atendiendo, setAtendiendo] = useState<Set<number>>(new Set());
  const [modalUnir, setModalUnir] = useState<any | null>(null);
  const [mesaBId, setMesaBId] = useState<number | null>(null);
  const [mergePreview, setMergePreview] = useState<{ totalPedidos: number; montoTotal: number } | null>(null);
  const [loadingMerge, setLoadingMerge] = useState(false);

  const MOTIVO_LABEL: Record<string, string> = {
    SERVILLETAS: "Servilletas",
    ADEREZOS: "Aderezos / condimentos",
    CUBIERTOS: "Cubiertos / utensilios",
    CONSULTA: "Tiene una consulta",
    OTRO: "Necesita atención",
  };

  const atenderLlamado = async (sesionId: number) => {
    setAtendiendo((prev) => new Set(prev).add(sesionId));
    try {
      await fetch("/api/pedidos/llamar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesionId }),
      });
      mutate();
    } catch { toast.error("Error al descartar llamado"); }
    finally { setAtendiendo((prev) => { const n = new Set(prev); n.delete(sesionId); return n; }); }
  };

  // Audio gestionado por audioManager (NotificationsManager lo desbloquea)

  // Ref a los datos de mesas para que MozoListener pueda leer nombres sin re-suscribirse
  const mesasDataRef = useRef<any[]>([]);
  useEffect(() => { mesasDataRef.current = mesas; }, [mesas]);

  // Toda la lógica de tiempo real está en <MozoListener />
  // (nuevo pedido, pedido listo, solicitaCuenta, cambios de mesa/sesión)

  // ── Acciones ────────────────────────────────────────────
  const confirmarCobro = async () => {
    if (!modalCuenta?.mesa || !modalCuenta.metodo) return;
    const mesa = modalCuenta.mesa;
    setPidiendoCuenta(mesa.id);
    try {
      const res = await fetch("/api/pedidos/cuenta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenEfimero: mesa.tokenEfimero, metodoPago: modalCuenta.metodo }),
      });
      if (res.ok) {
        toast.success(`Cuenta solicitada — ${mesa.nombre} 🧾`);
        setModalCuenta(null);
        mutate();
      } else {
        const d = await res.json();
        toast.error(d.error || "Error al solicitar cuenta");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setPidiendoCuenta(null); }
  };

  const entrarAMesa = async (mesaId: number, nombre: string) => {
    setPedidosListos((prev) => { const n = new Map(prev); n.delete(mesaId); return n; });
    setAbriendo(mesaId);
    const tid = toast.loading(`Abriendo ${nombre}…`);
    try {
      const res = await fetch("/api/mozo/abrir-mesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaId }),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Mesa abierta", { id: tid }); router.push(`/mesa/${data.token}?from=mozo`); }
      else { toast.error(data.error || "Error", { id: tid }); setAbriendo(null); }
    } catch { toast.error("Error de red", { id: tid }); setAbriendo(null); }
  };

  // ── Detalle de mesa ─────────────────────────────────────
  const abrirDetalle = async (mesa: any) => {
    if (!mesa.sesionId) return;
    setModalDetalle({ mesa });
    setDetalleSesion(null);
    setCargandoDetalle(true);
    try {
      const res = await fetch(`/api/mozo/sesion/${mesa.sesionId}`);
      if (res.ok) setDetalleSesion(await res.json());
      else toast.error("No se pudo cargar el detalle");
    } catch { toast.error("Error de conexión"); }
    finally { setCargandoDetalle(false); }
  };

  const cancelarItem = async (itemId: number) => {
    setCancelandoItem((prev) => new Set(prev).add(itemId));
    try {
      const res = await fetch("/api/mozo/cancelar-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al cancelar"); return; }
      // Refrescar detalle y lista de mesas
      if (modalDetalle?.mesa?.sesionId) {
        const res2 = await fetch(`/api/mozo/sesion/${modalDetalle.mesa.sesionId}`);
        if (res2.ok) setDetalleSesion(await res2.json());
      }
      mutate();
      toast.success("Ítem cancelado");
    } catch { toast.error("Error de conexión"); }
    finally { setCancelandoItem((prev) => { const n = new Set(prev); n.delete(itemId); return n; }); }
  };

  const cargarPreviewMerge = async (mesaId: number, sesionPrincipalId: number) => {
    setMesaBId(mesaId);
    setMergePreview(null);
    try {
      const res = await fetch(`/api/mozo/sesion/${sesionPrincipalId}/unir-mesa?mesaId=${mesaId}`);
      if (res.ok) setMergePreview(await res.json());
    } catch { /* preview es opcional */ }
  };

  const ejecutarUnion = async () => {
    if (!modalUnir || !mesaBId) return;
    setLoadingMerge(true);
    try {
      const res = await fetch(`/api/mozo/sesion/${modalUnir.sesionId}/unir-mesa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaUnidaId: mesaBId }),
      });
      if (res.ok) {
        const mesaBNombre = mesas.find((m: any) => m.id === mesaBId)?.nombre ?? mesaBId;
        toast.success(`${modalUnir.nombre} + ${mesaBNombre} unidas`);
        cerrarModalUnir();
        mutate();
      } else {
        const d = await res.json();
        toast.error(d.error || "No se pudo unir");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoadingMerge(false);
    }
  };

  const ejecutarSeparar = async (sesionPrincipalId: number, mesaUnidaId: number, mesaNombre: string) => {
    if (!confirm(`Los pedidos ya tomados quedan en la mesa principal. ¿Separar Mesa ${mesaNombre}?`)) return;
    try {
      const res = await fetch(`/api/mozo/sesion/${sesionPrincipalId}/separar-mesa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaUnidaId }),
      });
      if (res.ok) { toast.success(`Mesa ${mesaNombre} separada`); mutate(); }
      else { const d = await res.json(); toast.error(d.error || "No se pudo separar"); }
    } catch { toast.error("Error de conexión"); }
  };

  const cerrarModalUnir = () => { setModalUnir(null); setMesaBId(null); setMergePreview(null); };

  const mesasLibres   = mesas.filter((m: any) => !m.ocupada);
  const mesasOcupadas = mesas.filter((m: any) =>  m.ocupada);
  const pidenCuenta   = mesasOcupadas.filter((m: any) => m.solicitaCuenta).length;
  const listasCount   = pedidosListos.size;
  const llamadosCount = mesasOcupadas.filter((m: any) => m.llamadaMozo).length;

  const metodosLabel: Record<MetodoPago, string> = {
    QR: "📱 QR / Digital",
    TARJETA: "💳 Tarjeta",
    EFECTIVO: "💵 Efectivo",
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Toaster position="top-center" toastOptions={{ style: { fontSize: 13, fontWeight: 700 } }} />

      {/* Notificaciones nativas del OS + desbloqueo de audio */}
      <NotificationsManager />

      {/* MozoListener: canal único con todos los eventos en tiempo real */}
      {localId && (
        <MozoListener
          localId={localId}
          mesasRef={mesasDataRef}
          onUpdate={() => mutateRef.current()}
          onPedidoListo={(mesaId, tipo) =>
            setPedidosListos((prev) => new Map(prev).set(mesaId, tipo))
          }
        />
      )}

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white px-4 pt-3 pb-3 sticky top-0 z-30 shadow-xl">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-600 p-2 rounded-xl">
              <Utensils size={18} />
            </div>
            <div>
              <p className="font-black text-base leading-none tracking-tight">MODO MOZO</p>
              <p className="text-slate-400 text-[11px] mt-0.5 font-medium">
                {mesasOcupadas.length} ocupadas · {mesasLibres.length} libres
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {llamadosCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                <BellRing size={10} />
                {llamadosCount}
              </span>
            )}
            {pidenCuenta > 0 && (
              <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                <HandCoins size={10} />
                {pidenCuenta}
              </span>
            )}
            {listasCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">
                {listasCount} listo{listasCount > 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => (window.location.href = "/api/logout")}
              className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-colors active:scale-95"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* ── TABS ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-20 shadow-sm">
        <div className="max-w-2xl mx-auto flex">
          {(["ocupadas", "libres"] as Tab[]).map((t) => {
            const count  = t === "ocupadas" ? mesasOcupadas.length : mesasLibres.length;
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-black uppercase tracking-wider transition-all relative
                  ${active ? "text-red-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                <span
                  className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black
                    ${active
                      ? t === "ocupadas" ? "bg-red-600 text-white" : "bg-green-500 text-white"
                      : "bg-slate-100 text-slate-500"
                    }`}
                >
                  {count}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENIDO ──────────────────────────────────────── */}
      <main className="flex-1 p-3 pb-8 max-w-2xl mx-auto w-full">
        {isLoading && mesas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin text-slate-400" size={36} />
            <p className="text-slate-400 text-sm font-medium">Cargando mesas…</p>
          </div>
        ) : tab === "ocupadas" ? (
          mesasOcupadas.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <CheckCircle2 size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Sin mesas ocupadas</p>
            </div>
          ) : (
            <div className="space-y-3 mt-1">
              {mesasOcupadas.map((mesa) => {
                const pedidoListo  = pedidosListos.get(mesa.id);
                const pideCuenta   = !!mesa.solicitaCuenta;
                const llamado      = mesa.llamadaMozo as string | null;
                const cargando     = pidiendoCuenta === mesa.id || abriendo === mesa.id;

                return (
                  <div
                    key={mesa.id}
                    className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all
                      ${pideCuenta
                        ? "border-yellow-300 shadow-yellow-100"
                        : llamado
                          ? "border-orange-300 shadow-orange-100"
                          : pedidoListo
                            ? "border-red-200 shadow-red-50"
                            : "border-slate-100"
                      }`}
                  >
                    {/* Banda llamado al mozo */}
                    {llamado && (
                      <div className="px-4 py-2 flex items-center justify-between gap-2 bg-orange-500 text-white">
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide">
                          <BellRing size={12} />
                          {MOTIVO_LABEL[llamado] ?? "Necesita atención"}
                        </div>
                        <button
                          onClick={() => atenderLlamado(mesa.sesionId)}
                          disabled={atendiendo.has(mesa.sesionId)}
                          className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-colors active:scale-95 disabled:opacity-50"
                        >
                          {atendiendo.has(mesa.sesionId)
                            ? <Loader2 size={10} className="animate-spin" />
                            : <><Check size={10} /> Atendido</>
                          }
                        </button>
                      </div>
                    )}

                    {/* Banda superior de estado (cuenta / pedido listo) */}
                    {(pideCuenta || pedidoListo) && (
                      <div
                        className={`px-4 py-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide
                          ${pideCuenta ? "bg-yellow-400 text-yellow-900" : "bg-red-500 text-white"}`}
                      >
                        {pideCuenta ? (
                          <>
                            <HandCoins size={12} />
                            {mesa.metodoPago === "QR"       && "📱 Paga con QR"}
                            {mesa.metodoPago === "TARJETA"  && "💳 Paga con tarjeta"}
                            {mesa.metodoPago === "EFECTIVO" && "💵 Paga en efectivo"}
                            {!mesa.metodoPago               && "Cuenta solicitada"}
                          </>
                        ) : pedidoListo ? (
                          <ChipListo tipo={pedidoListo} />
                        ) : null}
                      </div>
                    )}

                    <div className="p-4">
                      {/* Fila principal: nombre + total */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-slate-800 leading-none">
                              {mesa.nombre}
                            </span>
                            <CircleDot
                              size={10}
                              className={`${
                                pideCuenta ? "text-yellow-500" : llamado ? "text-orange-500" : pedidoListo ? "text-red-400" : "text-red-500"
                              } animate-pulse`}
                            />
                          </div>
                          {mesa.sector && (
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                              {mesa.sector}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-black text-slate-900 leading-none">
                            ${mesa.totalActual.toLocaleString()}
                          </p>
                          {mesa.horaInicio && (
                            <div className="mt-1 flex justify-end">
                              <TiempoMesa fecha={mesa.horaInicio} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Resumen de ítems (máx 3) */}
                      {mesa.detalles?.length > 0 && (
                        <div className="bg-slate-50 rounded-xl px-3 py-2 mb-3 space-y-1.5">
                          {mesa.detalles.slice(0, 3).map((d: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-slate-600 font-medium truncate mr-2">
                                <span className="font-black text-slate-800 mr-1">{d.cantidad}×</span>
                                {d.producto}
                              </span>
                              <span className="text-slate-500 shrink-0 font-bold">${d.subtotal}</span>
                            </div>
                          ))}
                          {mesa.detalles.length > 3 && (
                            <p className="text-[10px] text-slate-400 font-bold">
                              +{mesa.detalles.length - 3} ítems más…
                            </p>
                          )}
                        </div>
                      )}

                      {/* Botones de acción */}
                      {mesa.esUnida ? (
                        /* Mesa subordinada (unida a otra) */
                        <div className="flex items-center justify-between gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
                          <div className="flex items-center gap-1.5 text-blue-700 text-xs font-black">
                            <Link2 size={13} />
                            Unida a {mesa.mesaPrincipalNombre}
                          </div>
                          <button
                            onClick={() => ejecutarSeparar(mesa.sesionPrincipalId, mesa.id, mesa.nombre)}
                            className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors active:scale-95"
                          >
                            <Link2Off size={12} /> Separar
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            disabled={cargando}
                            onClick={() => abrirDetalle(mesa)}
                            className="py-3.5 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <ClipboardList size={15} />
                            Pedidos
                          </button>

                          <button
                            disabled={pideCuenta || cargando}
                            onClick={() => !pideCuenta && setModalCuenta({ mesa, metodo: null })}
                            className={`py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5
                              ${pideCuenta
                                ? "bg-yellow-100 text-yellow-700 cursor-not-allowed"
                                : "bg-slate-900 active:bg-black text-white"
                              } disabled:opacity-60`}
                          >
                            {pidiendoCuenta === mesa.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : pideCuenta ? (
                              <><HandCoins size={13} /> Solicitada</>
                            ) : (
                              <><Receipt size={13} /> Cobrar</>
                            )}
                          </button>

                          {/* Botón Unir mesa (solo mesas ocupadas no unidas) */}
                          <button
                            onClick={() => setModalUnir(mesa)}
                            className="col-span-2 py-2.5 rounded-xl border-2 border-slate-100 text-slate-400 font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Link2 size={13} /> Unir con otra mesa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── TAB LIBRES ── */
          mesasLibres.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <Utensils size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Todas las mesas están ocupadas</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-1">
              {mesasLibres.map((mesa) => (
                <button
                  key={mesa.id}
                  disabled={abriendo !== null}
                  onClick={() => entrarAMesa(mesa.id, mesa.nombre)}
                  className="relative p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-left transition-all active:scale-95 active:border-green-300 flex flex-col gap-1 min-h-[100px] disabled:opacity-60"
                >
                  {abriendo === mesa.id && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                      <Loader2 className="animate-spin text-slate-600" size={22} />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xl text-slate-600">{mesa.nombre}</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  {mesa.sector && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {mesa.sector}
                    </span>
                  )}
                  <span className="text-xs text-slate-300 font-semibold mt-auto pt-2">
                    Toca para abrir
                  </span>
                </button>
              ))}
            </div>
          )
        )}
      </main>

      {/* ── MODAL UNIR MESAS ─────────────────────────────────── */}
      {modalUnir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <Link2 size={20} className="text-blue-600" />
                Unir {modalUnir.nombre}
              </h3>
              <button
                onClick={cerrarModalUnir}
                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors active:scale-95"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Mesa a incorporar
                </p>
                <select
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-400 bg-white"
                  value={mesaBId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) cargarPreviewMerge(id, modalUnir.sesionId);
                    else { setMesaBId(null); setMergePreview(null); }
                  }}
                >
                  <option value="">— Elegir mesa —</option>
                  {mesas
                    .filter((m: any) => m.id !== modalUnir.id && !m.esUnida)
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} — {m.ocupada ? `Ocupada ($${m.totalActual})` : "Libre"}
                      </option>
                    ))}
                </select>
              </div>

              {mergePreview && (
                <div className={`rounded-2xl p-4 text-sm space-y-1 ${
                  mergePreview.totalPedidos > 0
                    ? "bg-amber-50 border-2 border-amber-200"
                    : "bg-green-50 border-2 border-green-200"
                }`}>
                  {mergePreview.totalPedidos > 0 ? (
                    <>
                      <p className="font-black text-amber-800">
                        {mesas.find((m: any) => m.id === mesaBId)?.nombre} tiene {mergePreview.totalPedidos} pedido{mergePreview.totalPedidos > 1 ? "s" : ""} (${mergePreview.montoTotal})
                      </p>
                      <p className="text-amber-700 text-xs">Al unir, pasan a {modalUnir.nombre}.</p>
                    </>
                  ) : (
                    <p className="font-black text-green-800">Sin pedidos activos — se puede unir directamente.</p>
                  )}
                </div>
              )}

              <button
                onClick={ejecutarUnion}
                disabled={!mesaBId || loadingMerge}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
              >
                {loadingMerge ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <><Link2 size={18} /> Confirmar unión</>
                )}
              </button>

              <div className="h-2" />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE DE MESA ────────────────────────────── */}
      {modalDetalle && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setModalDetalle(null)}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[85vh]">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                  <ClipboardList size={20} className="text-red-600" />
                  {modalDetalle.mesa.nombre}
                </h3>
                <p className="text-slate-500 text-sm font-medium">
                  Total:{" "}
                  <span className="font-black text-slate-900">
                    ${(detalleSesion
                      ? detalleSesion.pedidos
                          .flatMap((p: any) => p.items)
                          .filter((i: any) => i.estado !== "CANCELADO")
                          .reduce((acc: number, i: any) => acc + i.precio * i.cantidad, 0)
                      : modalDetalle.mesa.totalActual
                    ).toLocaleString()}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setModalDetalle(null)}
                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors active:scale-95"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {cargandoDetalle ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
              ) : !detalleSesion || detalleSesion.pedidos.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-sm">Sin pedidos activos</p>
                </div>
              ) : (
                detalleSesion.pedidos.map((pedido: any, idx: number) => {
                  const itemsActivos = pedido.items.filter((i: any) => i.estado !== "CANCELADO");
                  if (itemsActivos.length === 0) return null;
                  return (
                    <div key={pedido.id}>
                      {/* Encabezado del pedido */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Pedido #{idx + 1}
                        </span>
                        <span className="text-[10px] text-slate-300 font-medium">
                          {new Date(pedido.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="bg-slate-50 rounded-2xl overflow-hidden divide-y divide-slate-100">
                        {itemsActivos.map((item: any) => {
                          const entregado  = item.estado === "ENTREGADO";
                          const cancelando = cancelandoItem.has(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 px-4 py-3 transition-opacity ${cancelando ? "opacity-40" : ""}`}
                            >
                              {/* Estado dot */}
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  entregado ? "bg-green-400" : "bg-amber-400"
                                }`}
                              />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 leading-tight truncate">
                                  <span className="text-slate-500 font-black mr-1">{item.cantidad}×</span>
                                  {item.producto.nombre}
                                </p>
                                {item.observaciones && (
                                  <p className="text-[11px] text-slate-400 font-medium mt-0.5 italic truncate">
                                    {item.observaciones}
                                  </p>
                                )}
                              </div>

                              {/* Precio */}
                              <span className="text-sm font-black text-slate-700 shrink-0">
                                ${(item.precio * item.cantidad).toLocaleString()}
                              </span>

                              {/* Botón cancelar (solo PENDIENTE) */}
                              {!entregado ? (
                                <button
                                  onClick={() => cancelarItem(item.id)}
                                  disabled={cancelando}
                                  className="p-1.5 rounded-lg hover:bg-red-50 active:bg-red-100 text-slate-300 hover:text-red-500 transition-colors active:scale-95 flex-shrink-0"
                                  title="Cancelar ítem"
                                >
                                  {cancelando
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Trash2 size={14} />
                                  }
                                </button>
                              ) : (
                                <div className="w-7 flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: agregar más */}
            <div className="px-5 pb-6 pt-3 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => {
                  setModalDetalle(null);
                  router.push(`/mesa/${modalDetalle.mesa.tokenEfimero}?from=mozo`);
                }}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <PlusCircle size={18} />
                Agregar ítems a la mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL COBRO ──────────────────────────────────────── */}
      {modalCuenta && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setModalCuenta(null)}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            <div className="px-5 pb-4 pt-2 flex items-start justify-between border-b border-slate-100">
              <div>
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                  <Receipt size={20} className="text-red-600" />
                  Cobrar {modalCuenta.mesa.nombre}
                </h3>
                <p className="text-slate-500 text-sm mt-0.5 font-medium">
                  Total:{" "}
                  <span className="font-black text-slate-900">
                    ${modalCuenta.mesa.totalActual.toLocaleString()}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setModalCuenta(null)}
                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors active:scale-95 mt-1"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                ¿Cómo paga el cliente?
              </p>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {(["QR", "TARJETA", "EFECTIVO"] as MetodoPago[]).map((key) => {
                  const icons:  Record<MetodoPago, string> = { QR: "📱", TARJETA: "💳", EFECTIVO: "💵" };
                  const labels: Record<MetodoPago, string> = { QR: "QR", TARJETA: "Tarjeta", EFECTIVO: "Efectivo" };
                  const selected = modalCuenta.metodo === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setModalCuenta((p) => p ? { ...p, metodo: key } : p)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 font-bold text-sm
                        transition-all active:scale-95
                        ${selected
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                        }`}
                    >
                      <span className="text-3xl">{icons[key]}</span>
                      {labels[key]}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={confirmarCobro}
                disabled={!modalCuenta.metodo || pidiendoCuenta === modalCuenta.mesa.id}
                className={`w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95
                  flex items-center justify-center gap-2
                  ${!modalCuenta.metodo || pidiendoCuenta === modalCuenta.mesa.id
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-green-600 text-white shadow-lg shadow-green-200 hover:bg-green-700"
                  }`}
              >
                {pidiendoCuenta === modalCuenta.mesa.id ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <HandCoins size={20} />
                    {modalCuenta.metodo
                      ? `Confirmar — ${metodosLabel[modalCuenta.metodo]}`
                      : "Seleccioná un método"}
                  </>
                )}
              </button>

              <div className="h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
