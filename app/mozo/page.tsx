"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { createClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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

/* ══════════════════════════════════════════════════════════ */
export default function PanelMozo() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const [pidiendoCuenta, setPidiendoCuenta] = useState<number | null>(null);
  const [pedidosListos, setPedidosListos] = useState<Map<number, TipoPedido>>(new Map());
  const [tab, setTab] = useState<Tab>("ocupadas");
  const [modalCuenta, setModalCuenta] = useState<{ mesa: any; metodo: MetodoPago | null } | null>(null);

  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCajaRef = useRef<HTMLAudioElement | null>(null);

  /* Desbloqueo de audio en primer toque */
  useEffect(() => {
    audioRef.current = new Audio("/sounds/ding.mp3");
    audioCajaRef.current = new Audio("/sounds/caja.mp3");
    const unlock = () => {
      [audioRef, audioCajaRef].forEach((r) => {
        r.current?.play().then(() => { r.current?.pause(); r.current!.currentTime = 0; }).catch(() => {});
      });
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  const cargarMesas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mozo/mesas");
      if (res.ok) setMesas(await res.json());
      else toast.error("Error al cargar mesas");
    } catch { toast.error("Error de conexión"); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargarMesas(); }, []);

  /* WebSocket: pedido listo */
  useEffect(() => {
    const canal = supabase
      .channel("pedidos-mozo-listener")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Pedido" }, async (payload) => {
        const n = payload.new as any, o = payload.old as any;
        if (n.estado !== "ENTREGADO" || o.estado === "ENTREGADO") return;
        try {
          const res = await fetch(`/api/mozo/pedido-listo?pedidoId=${n.id}`);
          if (!res.ok) return;
          const { mesaId, mesaNombre, tipo } = await res.json();
          audioRef.current && ((audioRef.current.currentTime = 0), audioRef.current.play().catch(() => {}));
          navigator.vibrate?.([100, 50, 200]);
          notify.pedidoListo(mesaNombre, tipo);
          setPedidosListos((prev) => new Map(prev).set(mesaId, tipo));
          cargarMesas();
        } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  /* WebSocket: cliente pide cuenta */
  useEffect(() => {
    const yaNotificados = new Set<number>();
    const canal = supabase
      .channel("cuenta-mozo-listener")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Sesion" }, async (payload) => {
        if (payload.old.solicitaCuenta || !payload.new.solicitaCuenta) return;
        const mesaId = payload.new.mesaId;
        if (yaNotificados.has(mesaId)) return;
        yaNotificados.add(mesaId);
        setTimeout(() => yaNotificados.delete(mesaId), 15000);
        audioCajaRef.current && ((audioCajaRef.current.currentTime = 0), audioCajaRef.current.play().catch(() => {}));
        navigator.vibrate?.([300, 100, 300]);
        cargarMesas();
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

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
        cargarMesas();
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
      if (res.ok) { toast.success("Mesa abierta", { id: tid }); router.push(`/mesa/${data.token}`); }
      else { toast.error(data.error || "Error", { id: tid }); setAbriendo(null); }
    } catch { toast.error("Error de red", { id: tid }); setAbriendo(null); }
  };

  const mesasLibres   = mesas.filter((m) => !m.ocupada);
  const mesasOcupadas = mesas.filter((m) =>  m.ocupada);
  const pidenCuenta   = mesasOcupadas.filter((m) => m.solicitaCuenta).length;
  const listasCount   = pedidosListos.size;

  const metodosLabel: Record<MetodoPago, string> = {
    QR: "📱 QR / Digital",
    TARJETA: "💳 Tarjeta",
    EFECTIVO: "💵 Efectivo",
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Toaster position="top-center" toastOptions={{ style: { fontSize: 13, fontWeight: 700 } }} />

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
            {pidenCuenta > 0 && (
              <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                <HandCoins size={10} />
                {pidenCuenta}
              </span>
            )}
            {listasCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">
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
        {loading && mesas.length === 0 ? (
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
                const pedidoListo = pedidosListos.get(mesa.id);
                const pideCuenta  = !!mesa.solicitaCuenta;
                const cargando    = pidiendoCuenta === mesa.id || abriendo === mesa.id;

                return (
                  <div
                    key={mesa.id}
                    className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all
                      ${pideCuenta
                        ? "border-yellow-300 shadow-yellow-100"
                        : pedidoListo
                          ? "border-orange-300 shadow-orange-100"
                          : "border-slate-100"
                      }`}
                  >
                    {/* Banda superior de estado */}
                    {(pideCuenta || pedidoListo) && (
                      <div
                        className={`px-4 py-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide
                          ${pideCuenta ? "bg-yellow-400 text-yellow-900" : "bg-orange-500 text-white"}`}
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
                                pideCuenta ? "text-yellow-500" : pedidoListo ? "text-orange-500" : "text-red-500"
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

                      {/* Botones de acción — targets amplios para dedos */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          disabled={cargando}
                          onClick={() => entrarAMesa(mesa.id, mesa.nombre)}
                          className="py-3.5 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {abriendo === mesa.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : "Ver menú"}
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
                      </div>
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

      {/* ── MODAL COBRO (bottom sheet) ──────────────────────── */}
      {modalCuenta && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setModalCuenta(null)}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">

            {/* Handle drag indicator */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
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

            {/* Cuerpo */}
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

              {/* Safe area iOS */}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}