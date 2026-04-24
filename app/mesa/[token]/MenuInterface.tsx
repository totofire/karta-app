"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Receipt, X, CheckCircle2, ArrowLeft, Plus, Minus,
  ShoppingCart, Clock, Flame, Loader2, Tag, BellRing,
  Sparkles, Salad, Utensils, MessageCircle, HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  type ReglaActiva,
  descuentoParaProducto,
  reglasGlobalesActivas,
} from "@/lib/descuentos-utils";
import { supabase } from "@/lib/supabase";

interface ItemCarrito {
  id: string;
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  observaciones: string;
  imagen?: string;
}

export default function MenuInterface({ mesa, categorias, tokenEfimero, pedidosHistoricos, esMozo, fromMozo, reglasActivas = [] }: any) {
  const reglas: ReglaActiva[] = reglasActivas;
  const globales = reglasGlobalesActivas(reglas);
  const router = useRouter();
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [verCuenta, setVerCuenta] = useState(false);
  const [verCarrito, setVerCarrito] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]?.id || 0);
  const [pidiendoCuenta, setPidiendoCuenta] = useState(false);

  // Propina
  const [propinaPct, setPropinaPct] = useState<number>(0);
  const [propinaCustom, setPropinaCustom] = useState("");
  const [mostrarCustomPropina, setMostrarCustomPropina] = useState(false);

  // Modal producto
  const [modalProducto, setModalProducto] = useState<any>(null);
  const [cantidadModal, setCantidadModal] = useState(1);
  const [observacionesModal, setObservacionesModal] = useState("");
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<"QR" | "TARJETA" | "EFECTIVO" | null>(null);

  // ── Llamar al mozo ────────────────────────────────────────────────────────
  const LLAMADO_KEY = `llamado-${tokenEfimero}`;
  const [verLlamadoSheet, setVerLlamadoSheet] = useState(false);
  // Inicializar en null para evitar hydration mismatch (SSR no tiene localStorage)
  const [llamadoActivo, setLlamadoActivo] = useState<string | null>(null);
  const [enviandoLlamado, setEnviandoLlamado] = useState(false);

  // Leer localStorage solo después de montar (cliente)
  useEffect(() => {
    const stored = localStorage.getItem(LLAMADO_KEY);
    if (stored) setLlamadoActivo(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detectar cuando el mozo marca el llamado como atendido (Sesion.llamadaMozo → null)
  useEffect(() => {
    const canal = supabase
      .channel(`menu-llamado-${tokenEfimero}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "Sesion", filter: `tokenEfimero=eq.${tokenEfimero}` },
        (payload) => {
          const nuevo = payload.new as Record<string, any>;
          if (!nuevo.llamadaMozo) {
            localStorage.removeItem(LLAMADO_KEY);
            setLlamadoActivo(null);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenEfimero]);

  const MOTIVOS = [
    { valor: "SERVILLETAS", label: "Servilletas",           icono: Sparkles },
    { valor: "ADEREZOS",    label: "Aderezos / condimentos", icono: Salad },
    { valor: "CUBIERTOS",   label: "Cubiertos / utensilios", icono: Utensils },
    { valor: "CONSULTA",    label: "Tengo una consulta",     icono: MessageCircle },
    { valor: "OTRO",        label: "Otro",                   icono: HelpCircle },
  ] as const;

  const llamarMozo = async (motivo: string) => {
    setEnviandoLlamado(true);
    try {
      const res = await fetch("/api/pedidos/llamar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenEfimero, motivo }),
      });
      if (res.ok) {
        setLlamadoActivo(motivo);
        localStorage.setItem(LLAMADO_KEY, motivo);
        setVerLlamadoSheet(false);
        toast.success("¡El mozo ya fue avisado!");
      } else {
        const d = await res.json();
        toast.error(d.error || "Error al llamar");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setEnviandoLlamado(false); }
  };



  // ── AGRUPACIÓN DE CUENTA ──────────────────────────────────────────────────
  const { itemsHistoricos, totalHistorico } = useMemo(() => {
    const mapa = new Map();
    let total = 0;
    if (!pedidosHistoricos) return { itemsHistoricos: [], totalHistorico: 0 };
    pedidosHistoricos
      .filter((p: any) => p.estado !== "CANCELADO")
      .forEach((pedido: any) => {
        pedido.items.forEach((item: any) => {
          if (item.estado === "CANCELADO") return;
          const key = item.producto.id;
          const subtotal = item.precio * item.cantidad;
          total += subtotal;
          if (mapa.has(key)) {
            const existente = mapa.get(key);
            existente.cantidad += item.cantidad;
            existente.subtotal += subtotal;
          } else {
            mapa.set(key, {
              nombre: item.producto.nombre,
              cantidad: item.cantidad,
              precio: item.precio,
              subtotal,
            });
          }
        });
      });
    return { itemsHistoricos: Array.from(mapa.values()), totalHistorico: total };
  }, [pedidosHistoricos]);

  // ── PROPINA ───────────────────────────────────────────────────────────────
  const propinaAmount = mostrarCustomPropina
    ? Math.max(0, Number(propinaCustom) || 0)
    : Math.round((totalHistorico * propinaPct) / 100);

  // ── SOLICITAR CUENTA ──────────────────────────────────────────────────────
  const pedirCuenta = async () => {
    if (!metodoPagoSeleccionado) return;
    setPidiendoCuenta(true);
    try {
      const res = await fetch("/api/pedidos/cuenta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenEfimero, metodoPago: metodoPagoSeleccionado, propina: propinaAmount }),
      });
      if (!res.ok) { toast.error("Error al solicitar cuenta"); return; }

      if (metodoPagoSeleccionado === "QR") {
        toast.loading("Generando link de pago...");
        const mpRes = await fetch("/api/mp/pagar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenEfimero }),
        });
        toast.dismiss();
        if (mpRes.ok) {
          const { checkoutUrl } = await mpRes.json();
          setVerCuenta(false);
          window.location.href = checkoutUrl;
          return;
        }
        const err = await mpRes.json();
        if (!err.error?.includes("no tiene Mercado Pago")) {
          toast.error(err.error || "Error al generar el pago");
          return;
        }
        toast.success("¡Listo! El encargado se acerca a cobrarte 📱");
      } else {
        const mensajes = {
          TARJETA: "¡Listo! El encargado ya sabe que pagás con tarjeta 💳",
          EFECTIVO: "¡Listo! El encargado se acerca a cobrarte 💵",
        };
        toast.success(mensajes[metodoPagoSeleccionado as "TARJETA" | "EFECTIVO"]);
      }
      setVerCuenta(false);
      setMetodoPagoSeleccionado(null);
    } catch { toast.error("Error de conexión"); }
    finally { setPidiendoCuenta(false); }
  };

  // ── SCROLL A CATEGORÍA ────────────────────────────────────────────────────
  const scrollearACategoria = (catId: number) => {
    setCategoriaActiva(catId);
    const elemento = document.getElementById(`cat-${catId}`);
    if (elemento) {
      const headerOffset = 130;
      const elementPosition = elemento.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  // ── MODAL PRODUCTO ────────────────────────────────────────────────────────
  const abrirModalProducto = (producto: any) => {
    setModalProducto(producto);
    setCantidadModal(1);
    setObservacionesModal("");
  };
  const cerrarModalProducto = () => {
    setModalProducto(null);
    setCantidadModal(1);
    setObservacionesModal("");
  };
  const agregarAlCarrito = () => {
    if (!modalProducto) return;
    const descuento = descuentoParaProducto(
      modalProducto.id,
      modalProducto.categoriaId,
      modalProducto.precio,
      reglas
    );
    const nuevoItem: ItemCarrito = {
      id: `${modalProducto.id}-${Date.now()}-${Math.random()}`,
      productoId: modalProducto.id,
      nombre: modalProducto.nombre,
      precio: descuento.precioEfectivo,
      cantidad: cantidadModal,
      observaciones: observacionesModal.trim(),
      imagen: modalProducto.imagen,
    };
    setCarrito((prev) => [...prev, nuevoItem]);
    toast.success(`${modalProducto.nombre} agregado al carrito`);
    cerrarModalProducto();
  };
  const eliminarDelCarrito = (itemId: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== itemId));
  };
  const editarCantidadCarrito = (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) { eliminarDelCarrito(itemId); return; }
    setCarrito((prev) => prev.map((item) => (item.id === itemId ? { ...item, cantidad: nuevaCantidad } : item)));
  };

  // ── CÁLCULOS DEL CARRITO ──────────────────────────────────────────────────
  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const precioTotal = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  // ── ENVIAR PEDIDO ─────────────────────────────────────────────────────────
  const confirmarPedido = async () => {
    setEnviando(true);
    const productos = carrito.map((item) => ({
      productoId: item.productoId,
      cantidad: item.cantidad,
      observaciones: item.observaciones || undefined,
    }));
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenEfimero, nombreCliente: null, productos }),
      });
      if (res.ok) {
        toast.success("¡Pedido enviado a cocina! 👨‍🍳");
        setCarrito([]);
        setEnviando(false);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al pedir");
        setEnviando(false);
      }
    } catch { toast.error("Error de conexión"); setEnviando(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-br from-red-600 to-red-700 text-white shadow-xl sticky top-0 z-20">
        <div className="px-3 py-2 flex items-center justify-between border-b border-white/10 h-[70px]">
          <div className="flex items-center gap-2 h-full">
            {fromMozo && (
              <button onClick={() => (window.location.href = "/mozo")} className="mr-2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="relative w-24 h-full min-h-[50px] drop-shadow-md">
              <Image src="/karta-logo.png" alt="Logo" fill sizes="(max-width: 768px) 100px, 150px" className="object-contain object-left" priority />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {itemsHistoricos.length > 0 && (
              <button onClick={() => setVerCuenta(true)} className="flex flex-col items-center justify-center bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-lg transition-colors border border-white/10 backdrop-blur-sm active:scale-95">
                <Receipt size={18} className="text-yellow-300 mb-0.5" />
                <span className="text-[9px] font-bold uppercase tracking-wide text-yellow-50">Mi Cuenta</span>
              </button>
            )}
            <div className="flex flex-col items-end justify-center leading-none">
              <span className="text-[9px] font-semibold text-red-200 uppercase tracking-widest mb-0.5">Mesa</span>
              <div className="bg-white/95 text-red-600 px-3 py-1 rounded-md font-black text-sm shadow-sm">{mesa.nombre}</div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto py-2 px-3 scrollbar-hide bg-red-700/50 backdrop-blur-sm">
          {categorias.map((cat: any) => (
            <button key={cat.id} onClick={() => scrollearACategoria(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                categoriaActiva === cat.id ? "bg-white text-red-600 border-white shadow-sm" : "bg-black/10 text-white border-transparent hover:bg-black/20"
              }`}>{cat.nombre}</button>
          ))}
        </div>
      </header>

      {/* ── LISTADO DE PRODUCTOS ───────────────────────────────────────────── */}
      <main className="p-4 space-y-8">

        {/* Banner de descuentos globales activos */}
        {globales.length > 0 && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md">
            <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
              <Tag size={16} />
            </div>
            <div>
              <p className="font-black text-sm leading-tight">
                {globales.map((r) =>
                  r.tipo === "DESCUENTO_GLOBAL"
                    ? `$${r.valor} de descuento en tu cuenta`
                    : `${r.valor}% de descuento en toda la carta`
                ).join(" · ")}
              </p>
              <p className="text-green-100 text-[11px] font-medium mt-0.5">
                Se aplica automáticamente al cerrar la cuenta
              </p>
            </div>
          </div>
        )}

        {categorias.map((cat: any) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
            <div className="flex items-center gap-2 mb-4 sticky top-[120px] bg-gray-50/95 backdrop-blur-sm p-2 z-10 -mx-2 rounded-lg">
              <div className="h-6 w-1 bg-red-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-gray-800">{cat.nombre}</h2>
            </div>
            <div className="grid gap-3">
              {cat.productos.map((prod: any) => {
                const descuento = descuentoParaProducto(prod.id, prod.categoriaId, prod.precio, reglas);
                return (
                  <div key={prod.id} onClick={() => abrirModalProducto(prod)}
                    className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-row gap-3 relative overflow-hidden group hover:shadow-md transition-all h-[120px] cursor-pointer active:scale-[0.98]">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>

                    {/* Badge de descuento */}
                    {descuento.badge && (
                      <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                        {descuento.badge}
                      </div>
                    )}

                    <div className="relative w-[100px] h-full flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                      {prod.imagen ? (
                        <Image src={prod.imagen} alt={prod.nombre} fill className="object-cover" sizes="(max-width: 768px) 100px, 150px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 leading-tight truncate pr-8">{prod.nombre}</h3>
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-tight">
                          {prod.descripcion || <span className="italic opacity-50">Sin descripción</span>}
                        </p>
                      </div>
                      <div className="flex items-end justify-between mt-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-lg font-black ${descuento.precioOriginal ? "text-green-600" : "text-red-600"}`}>
                            ${descuento.precioEfectivo.toLocaleString()}
                          </span>
                          {descuento.precioOriginal && (
                            <span className="text-xs text-gray-400 line-through font-medium">
                              ${descuento.precioOriginal.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">Agregar</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* ── BOTÓN FLOTANTE LLAMAR AL MOZO ──────────────────────────────────── */}
      <div className="fixed bottom-0 left-4 z-30 pb-4 flex items-end">
        <button
          onClick={() => { if (!llamadoActivo) setVerLlamadoSheet(true); }}
          disabled={!!llamadoActivo}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg font-bold text-sm transition-all active:scale-95
            ${llamadoActivo
              ? "bg-amber-100 text-amber-700 border border-amber-300 cursor-not-allowed"
              : "bg-white text-slate-800 border border-slate-200 hover:border-slate-300 hover:shadow-xl"
            }`}
        >
          <BellRing size={17} className={llamadoActivo ? "text-amber-500" : "text-slate-600"} />
          {llamadoActivo ? "En camino…" : "Llamar al mozo"}
        </button>
      </div>

      {/* ── FOOTER FLOTANTE (CARRITO) ──────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent p-4 z-30 animate-in slide-in-from-bottom-4">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-3">
              <button onClick={() => setVerCarrito(true)} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
                <ShoppingCart size={20} />
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block">Carrito</span>
                  <span className="text-sm font-medium">{totalItems} {totalItems === 1 ? "ítem" : "ítems"}</span>
                </div>
              </button>
              <span className="text-3xl font-black bg-gradient-to-br from-red-600 to-red-700 bg-clip-text text-transparent">${precioTotal}</span>
            </div>
            <button onClick={confirmarPedido} disabled={enviando}
              className="w-full bg-gradient-to-br from-red-600 to-red-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-all hover:shadow-xl hover:shadow-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
              {enviando ? (<><Loader2 size={20} className="animate-spin" /> ENVIANDO...</>) : (<><Flame size={20} /> ENVIAR A COCINA</>)}
            </button>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Clock size={12} className="text-amber-500" />
              <p className="text-center text-xs text-amber-500 font-bold uppercase tracking-wide">Tu pedido aún no fue enviado</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE PRODUCTO ──────────────────────────────────────────────── */}
      {modalProducto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 max-h-[90vh] flex flex-col">
            <div className="relative w-full h-64 bg-gray-100 flex-shrink-0">
              {modalProducto.imagen ? (
                <Image src={modalProducto.imagen} alt={modalProducto.nombre} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
              )}
              <button onClick={cerrarModalProducto} className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors backdrop-blur-sm">
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-2xl font-black text-gray-900 mb-2">{modalProducto.nombre}</h2>
              {(() => {
                const d = descuentoParaProducto(modalProducto.id, modalProducto.categoriaId, modalProducto.precio, reglas);
                return (
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <p className={`text-3xl font-black ${d.precioOriginal ? "text-green-600" : "text-red-600"}`}>
                      ${d.precioEfectivo.toLocaleString()}
                    </p>
                    {d.precioOriginal && (
                      <p className="text-xl text-gray-400 line-through font-medium">
                        ${d.precioOriginal.toLocaleString()}
                      </p>
                    )}
                    {d.badge && (
                      <span className="bg-green-500 text-white text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm">
                        {d.badge}
                      </span>
                    )}
                  </div>
                );
              })()}
              {modalProducto.descripcion && <p className="text-gray-600 text-sm mb-6 leading-relaxed">{modalProducto.descripcion}</p>}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Cantidad</label>
                <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <button onClick={() => setCantidadModal(Math.max(1, cantidadModal - 1))}
                    className="w-10 h-10 bg-white text-gray-600 font-bold rounded-lg shadow-sm active:scale-95 flex items-center justify-center border border-gray-200 hover:bg-gray-100 transition-colors"><Minus size={20} /></button>
                  <span className="font-black text-2xl text-gray-800 flex-1 text-center">{cantidadModal}</span>
                  <button onClick={() => setCantidadModal(cantidadModal + 1)}
                    className="w-10 h-10 bg-white text-red-600 font-bold rounded-lg shadow-sm active:scale-95 flex items-center justify-center border border-red-100 hover:bg-red-50 transition-colors"><Plus size={20} /></button>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Observaciones <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                </label>
                <textarea value={observacionesModal} onChange={(e) => setObservacionesModal(e.target.value)}
                  placeholder="Ej: Sin cebolla, punto medio, sin sal..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  rows={3} maxLength={200} />
                <p className="text-xs text-gray-400 mt-1 text-right">{observacionesModal.length}/200</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              {(() => {
                const d = descuentoParaProducto(modalProducto.id, modalProducto.categoriaId, modalProducto.precio, reglas);
                const subtotal = d.precioEfectivo * cantidadModal;
                return (
                  <button onClick={agregarAlCarrito}
                    className="w-full bg-gradient-to-br from-red-600 to-red-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-all hover:shadow-xl hover:shadow-red-300 flex items-center justify-center gap-2 text-lg">
                    <Plus size={20} /> AGREGAR · ${subtotal.toLocaleString()}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DEL CARRITO ──────────────────────────────────────────────── */}
      {verCarrito && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 max-h-[80vh] flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-black text-xl flex items-center gap-2"><ShoppingCart size={22} /> Tu Carrito</h3>
                <p className="text-slate-400 text-xs mt-1 font-medium">{totalItems} productos</p>
              </div>
              <button onClick={() => setVerCarrito(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {carrito.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex gap-3 mb-3">
                        <div className="relative w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0">
                          {item.imagen ? (<Image src={item.imagen} alt={item.nombre} fill className="object-cover" />) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 truncate">{item.nombre}</h4>
                          <p className="text-red-600 font-black text-lg">${item.precio * item.cantidad}</p>
                          {item.observaciones && <p className="text-xs text-gray-500 italic mt-1 line-clamp-2">"{item.observaciones}"</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200">
                          <button onClick={() => editarCantidadCarrito(item.id, item.cantidad - 1)}
                            className="w-8 h-8 bg-gray-100 text-gray-600 font-bold rounded-md active:scale-95 flex items-center justify-center hover:bg-gray-200 transition-colors"><Minus size={16} /></button>
                          <span className="font-black text-gray-800 text-sm min-w-[20px] text-center">{item.cantidad}</span>
                          <button onClick={() => editarCantidadCarrito(item.id, item.cantidad + 1)}
                            className="w-8 h-8 bg-red-50 text-red-600 font-bold rounded-md active:scale-95 flex items-center justify-center hover:bg-red-100 transition-colors"><Plus size={16} /></button>
                        </div>
                        <button onClick={() => eliminarDelCarrito(item.id)} className="text-red-500 hover:text-red-700 text-sm font-bold uppercase tracking-wide transition-colors">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total</span>
                <span className="text-3xl font-black text-slate-900">${precioTotal}</span>
              </div>
              <button onClick={() => setVerCarrito(false)}
                className="w-full bg-gradient-to-br from-red-600 to-red-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-all hover:shadow-xl hover:shadow-red-300">CONTINUAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET LLAMAR AL MOZO ────────────────────────────────────── */}
      {verLlamadoSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => e.target === e.currentTarget && setVerLlamadoSheet(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-5 pb-2 pt-2 flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <BellRing size={20} className="text-red-600" /> ¿Qué necesitás?
              </h3>
              <button onClick={() => setVerLlamadoSheet(false)}
                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={18} className="text-slate-600" />
              </button>
            </div>
            <div className="px-5 pb-8 pt-2 grid grid-cols-1 gap-2">
              {MOTIVOS.map(({ valor, label, icono: Icono }) => (
                <button key={valor} onClick={() => llamarMozo(valor)} disabled={enviandoLlamado}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-left font-bold text-sm text-slate-800 disabled:opacity-50">
                  <div className="bg-red-50 p-2 rounded-xl flex-shrink-0">
                    <Icono size={18} className="text-red-600" />
                  </div>
                  {label}
                  {enviandoLlamado && <Loader2 size={14} className="ml-auto animate-spin text-slate-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MI CUENTA ────────────────────────────────────────────────── */}
      {verCuenta && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-black text-xl flex items-center gap-2">
                  <Receipt size={22} className="text-yellow-400" /> Tu Consumo
                </h3>
                <p className="text-slate-400 text-xs mt-1 font-medium">Mesa {mesa.nombre} · Resumen parcial</p>
              </div>
              <button onClick={() => setVerCuenta(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors relative z-10"><X size={20} /></button>
            </div>
            <div className="p-5 max-h-[35vh] overflow-y-auto">
              {itemsHistoricos.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><p>Aún no has pedido nada.</p></div>
              ) : (
                <div className="space-y-3">
                  {itemsHistoricos.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center border-b border-dashed border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex gap-3 items-center">
                        <span className="bg-slate-100 text-slate-700 font-bold w-6 h-6 flex items-center justify-center rounded text-xs shrink-0">{item.cantidad}</span>
                        <p className="font-semibold text-gray-800 text-sm">{item.nombre}</p>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">${item.subtotal}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-baseline">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Subtotal</span>
              <span className="text-3xl font-black text-slate-900">${totalHistorico}</span>
            </div>
            <div className="px-5 pb-1">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">¿Dejás propina?</p>
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {([0, 10, 15, 20] as const).map((pct) => (
                  <button
                    key={pct}
                    onClick={() => { setPropinaPct(pct); setMostrarCustomPropina(false); setPropinaCustom(""); }}
                    className={`py-2.5 rounded-xl border-2 text-xs font-black transition-all active:scale-95 ${
                      !mostrarCustomPropina && propinaPct === pct
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {pct === 0 ? "No" : `${pct}%`}
                  </button>
                ))}
                <button
                  onClick={() => { setMostrarCustomPropina(true); setPropinaPct(0); }}
                  className={`py-2.5 rounded-xl border-2 text-xs font-black transition-all active:scale-95 ${
                    mostrarCustomPropina
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  $...
                </button>
              </div>
              {mostrarCustomPropina && (
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Monto en $"
                  value={propinaCustom}
                  onChange={(e) => setPropinaCustom(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold mb-2 focus:outline-none focus:border-slate-900"
                />
              )}
              {propinaAmount > 0 && (
                <div className="flex justify-between items-baseline bg-green-50 rounded-xl px-3 py-2 mb-2">
                  <span className="text-xs font-bold text-green-700">Propina</span>
                  <span className="font-black text-green-700">+${propinaAmount}</span>
                </div>
              )}
              {propinaAmount > 0 && (
                <div className="flex justify-between items-baseline px-1 mb-1">
                  <span className="text-sm font-black text-gray-700 uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-black text-slate-900">${totalHistorico + propinaAmount}</span>
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">¿Cómo vas a pagar?</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { key: "QR", emoji: "📱", label: "QR / Digital" },
                  { key: "TARJETA", emoji: "💳", label: "Tarjeta" },
                  { key: "EFECTIVO", emoji: "💵", label: "Efectivo" },
                ].map((metodo) => (
                  <button key={metodo.key} onClick={() => setMetodoPagoSeleccionado(metodo.key as any)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all active:scale-95 font-bold text-xs ${
                      metodoPagoSeleccionado === metodo.key
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                    }`}>
                    <span className="text-2xl">{metodo.emoji}</span>
                    {metodo.label}
                  </button>
                ))}
              </div>
              <button onClick={pedirCuenta} disabled={pidiendoCuenta || !metodoPagoSeleccionado}
                className={`w-full font-bold py-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-base ${
                  !metodoPagoSeleccionado ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : pidiendoCuenta ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200"
                }`}>
                {pidiendoCuenta ? <Loader2 size={18} className="animate-spin" /> : <><Receipt size={18} /> SOLICITAR CUENTA</>}
              </button>
              {!metodoPagoSeleccionado && <p className="text-center text-xs text-gray-400 mt-2">Seleccioná un método para continuar</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}