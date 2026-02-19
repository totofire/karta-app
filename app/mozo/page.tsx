"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw, Loader2, Utensils, LogOut,
  Clock, DollarSign, Flame, GlassWater, ChefHat,
  HandCoins, Receipt
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { createClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TipoPedido = "cocina" | "barra" | "ambos";

const TiempoMesa = ({ fecha }: { fecha: string }) => {
  const [minutos, setMinutos] = useState(0);
  useEffect(() => {
    const calcular = () => {
      const diff = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / 60000);
      setMinutos(diff);
    };
    calcular();
    const intervalo = setInterval(calcular, 60000);
    return () => clearInterval(intervalo);
  }, [fecha]);

  const horas = Math.floor(minutos / 60);
  const mins  = minutos % 60;
  const urgente = minutos > 90;

  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${urgente ? "text-red-500" : "text-slate-400"}`}>
      <Clock size={12} />
      {horas > 0 ? `${horas}h ${mins}m` : `${minutos}m`}
    </span>
  );
};

const BadgePedidoListo = ({ tipo }: { tipo: TipoPedido }) => (
  <div className={`
    absolute -top-3 left-1/2 -translate-x-1/2 z-20
    flex items-center gap-1 px-2 py-1 rounded-full shadow-lg
    text-white text-[9px] font-black uppercase tracking-wide whitespace-nowrap animate-bounce
    ${tipo === "barra" ? "bg-blue-500 shadow-blue-200" : "bg-orange-500 shadow-orange-200"}
  `}>
    {tipo === "barra" ? <GlassWater size={10} /> : tipo === "ambos" ? <ChefHat size={10} /> : <Flame size={10} />}
    {tipo === "barra" ? "Bebida lista" : tipo === "ambos" ? "Todo listo" : "Plato listo"}
  </div>
);

export default function PanelMozo() {
  const [mesas, setMesas]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [abriendo, setAbriendo]         = useState<number | null>(null);
  const [pidiendoCuenta, setPidiendoCuenta] = useState<number | null>(null); // mesaId
  const [pedidosListos, setPedidosListos]   = useState<Map<number, TipoPedido>>(new Map());
  const router     = useRouter();
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const audioCajaRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current     = new Audio("/sounds/ding.mp3");
    audioCajaRef.current = new Audio("/sounds/caja.mp3");
    const unlock = () => {
      [audioRef, audioCajaRef].forEach(r => {
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

  useEffect(() => {
    cargarMesas();
    const intervalo = setInterval(cargarMesas, 30000);
    return () => clearInterval(intervalo);
  }, []);

  // Listener: pedidos listos (cocina/barra)
  useEffect(() => {
    const canal = supabase
      .channel("pedidos-mozo-listener")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Pedido" },
        async (payload) => {
          const nuevo = payload.new as any;
          const viejo = payload.old as any;
          if (nuevo.estado !== "ENTREGADO" || viejo.estado === "ENTREGADO") return;

          try {
            const res = await fetch(`/api/mozo/pedido-listo?pedidoId=${nuevo.id}`);
            if (!res.ok) return;
            const { mesaId, mesaNombre, tipo } = await res.json();

            audioRef.current && (audioRef.current.currentTime = 0, audioRef.current.play().catch(() => {}));
            navigator.vibrate?.([100, 50, 200]);
            notify.pedidoListo(mesaNombre, tipo);
            setPedidosListos(prev => new Map(prev).set(mesaId, tipo));
            cargarMesas();
          } catch {}
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  // Listener: cliente pide cuenta (para actualizr el badge visual)
  useEffect(() => {
    const yaNotificados = new Set<number>();
    const canal = supabase
      .channel("cuenta-mozo-listener")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Sesion" },
        async (payload) => {
          const pideCuenta = !payload.old.solicitaCuenta && payload.new.solicitaCuenta;
          if (!pideCuenta) return;

          const mesaId = payload.new.mesaId;
          if (yaNotificados.has(mesaId)) return;
          yaNotificados.add(mesaId);
          setTimeout(() => yaNotificados.delete(mesaId), 15000);

          const { data } = await supabase.from("Mesa").select("nombre").eq("id", mesaId).single();
          audioCajaRef.current && (audioCajaRef.current.currentTime = 0, audioCajaRef.current.play().catch(() => {}));
          navigator.vibrate?.([300, 100, 300]);
          // Solo actualizar UI, la notificación la maneja el admin
          cargarMesas();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  // Pedir cuenta desde el mozo (misma lógica que el cliente)
  const pedirCuenta = async (mesa: any) => {
    if (!mesa.tokenEfimero) return toast.error("Mesa sin sesión activa");
    setPidiendoCuenta(mesa.id);
    try {
      const res = await fetch("/api/pedidos/cuenta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenEfimero: mesa.tokenEfimero }),
      });
      if (res.ok) {
        toast.success(`Cuenta solicitada para ${mesa.nombre} 🧾`);
        cargarMesas();
      } else {
        toast.error("Error al solicitar cuenta");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setPidiendoCuenta(null); }
  };

  const entrarAMesa = async (mesaId: number, nombreMesa: string) => {
    setPedidosListos(prev => { const n = new Map(prev); n.delete(mesaId); return n; });
    setAbriendo(mesaId);
    const toastId = toast.loading(`Accediendo a ${nombreMesa}...`);
    try {
      const res  = await fetch("/api/mozo/abrir-mesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Mesa abierta", { id: toastId });
        router.push(`/mesa/${data.token}`);
      } else {
        toast.error(data.error || "Error", { id: toastId });
        setAbriendo(null);
      }
    } catch {
      toast.error("Error de red", { id: toastId });
      setAbriendo(null);
    }
  };

  const salir = () => { window.location.href = "/api/logout"; };

  const mesasLibres   = mesas.filter(m => !m.ocupada);
  const mesasOcupadas = mesas.filter(m => m.ocupada);
  const pidenCuenta   = mesasOcupadas.filter(m => m.solicitaCuenta).length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-20">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Utensils className="text-red-600" />
            MODO MOZO
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-slate-500 text-xs md:text-sm">
              {mesasOcupadas.length} ocupadas · {mesasLibres.length} libres
            </p>
            {pidenCuenta > 0 && (
              <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                <HandCoins size={10} />
                {pidenCuenta} {pidenCuenta === 1 ? "pide cuenta" : "piden cuenta"}
              </span>
            )}
            {pedidosListos.size > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {pedidosListos.size} {pedidosListos.size === 1 ? "pedido listo" : "pedidos listos"}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargarMesas} disabled={loading} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={salir} className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-600 hover:bg-red-100 transition-all flex items-center gap-2 font-bold text-sm">
            <LogOut size={20} />
            <span className="hidden md:inline">SALIR</span>
          </button>
        </div>
      </div>

      {loading && mesas.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={40} />
        </div>
      ) : (
        <div className="space-y-6">

          {/* MESAS OCUPADAS */}
          {mesasOcupadas.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">
                Ocupadas ({mesasOcupadas.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mesasOcupadas.map((mesa) => {
                  const pedidoListo = pedidosListos.get(mesa.id);
                  const pideCuenta  = !!mesa.solicitaCuenta;
                  const cargandoCuenta = pidiendoCuenta === mesa.id;

                  return (
                    <div key={mesa.id} className="relative">

                      {/* Badge pedido listo */}
                      {pedidoListo && !pideCuenta && <BadgePedidoListo tipo={pedidoListo} />}

                      {/* Badge pide cuenta */}
                      {pideCuenta && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-400 shadow-lg shadow-yellow-200 text-yellow-900 text-[9px] font-black uppercase tracking-wide whitespace-nowrap animate-bounce">
                          <HandCoins size={10} />
                          Cuenta solicitada
                        </div>
                      )}

                      <div className={`
                        pt-5 p-4 rounded-2xl border-2 shadow-sm flex flex-col gap-2
                        ${pideCuenta
                          ? "bg-yellow-50 border-yellow-300 shadow-yellow-100"
                          : pedidoListo
                            ? "bg-orange-50 border-orange-300 shadow-orange-100"
                            : "bg-white border-red-200"
                        }
                      `}>
                        {/* Nombre + indicador */}
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xl text-slate-800">{mesa.nombre}</span>
                          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${pideCuenta ? "bg-yellow-500" : pedidoListo ? "bg-orange-500" : "bg-red-500"}`} />
                        </div>

                        {mesa.sector && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {mesa.sector}
                          </span>
                        )}

                        <div className="border-t border-dashed border-slate-100 my-1" />

                        {/* Total + Tiempo */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-green-600 font-black text-lg">
                            <DollarSign size={16} strokeWidth={3} />
                            {mesa.totalActual.toLocaleString()}
                          </div>
                          {mesa.horaInicio && <TiempoMesa fecha={mesa.horaInicio} />}
                        </div>

                        {/* Botones */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            disabled={abriendo !== null}
                            onClick={() => entrarAMesa(mesa.id, mesa.nombre)}
                            className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1"
                          >
                            {abriendo === mesa.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : "Ver Menú"
                            }
                          </button>

                          {/* Pedir cuenta — deshabilitado si ya fue solicitada */}
                          <button
                            disabled={pideCuenta || cargandoCuenta}
                            onClick={() => pedirCuenta(mesa)}
                            className={`
                              py-2 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1
                              ${pideCuenta
                                ? "bg-yellow-100 text-yellow-600 cursor-not-allowed"
                                : "bg-slate-900 hover:bg-black text-white"
                              }
                            `}
                          >
                            {cargandoCuenta
                              ? <Loader2 size={14} className="animate-spin" />
                              : pideCuenta
                                ? <><HandCoins size={12} /> Solicitada</>
                                : <><Receipt size={12} /> Pedir Cuenta</>
                            }
                          </button>
                        </div>

                        {/* Etiqueta pedido listo */}
                        {pedidoListo && (
                          <div className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide ${pedidoListo === "barra" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                            {pedidoListo === "barra"
                              ? <><GlassWater size={12} /> Llevar bebidas</>
                              : pedidoListo === "ambos"
                                ? <><ChefHat size={12} /> Llevar todo</>
                                : <><Flame size={12} /> Llevar platos</>
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MESAS LIBRES */}
          {mesasLibres.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">
                Libres ({mesasLibres.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mesasLibres.map((mesa) => (
                  <button
                    key={mesa.id}
                    disabled={abriendo !== null}
                    onClick={() => entrarAMesa(mesa.id, mesa.nombre)}
                    className="relative p-4 rounded-2xl border-2 border-dashed border-slate-200 shadow-sm transition-all active:scale-95 flex flex-col gap-2 bg-white text-left hover:border-green-300 hover:shadow-md opacity-70 hover:opacity-100"
                  >
                    {abriendo === mesa.id && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                        <Loader2 className="animate-spin text-slate-800" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xl text-slate-500">{mesa.nombre}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    {mesa.sector && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{mesa.sector}</span>
                    )}
                    <span className="text-xs text-slate-300 font-medium mt-1">Disponible</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}