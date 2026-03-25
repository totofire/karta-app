"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Toaster } from "react-hot-toast";
import NotificationsManager from "@/components/NotificationsManager";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { audioManager } from "@/lib/audio";
import { notify } from "@/lib/notify";
import { notificarNativo } from "@/lib/webNotify";
import type { PedidoPayload, SesionPayload } from "@/lib/supabase-types";
import {
  LayoutDashboard,
  ChefHat,
  QrCode,
  UtensilsCrossed,
  Armchair,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Tags,
  GlassWater,
  BarChart2,
  Users,
  Power,
  Settings,
} from "lucide-react";

const fetcher        = (url: string) => fetch(url).then(r => r.ok ? r.json() : []);
const fetcherMe      = (url: string) => fetch(url).then(r => r.ok ? r.json() : null);
const fetcherServicio = (url: string) => fetch(url).then(r => r.ok ? r.json() : null);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ── SWR ────────────────────────────────────────────────────────────────────
  const { data: cocina = [], mutate: mutateCocina } = useSWR("/api/cocina",       fetcher,   { revalidateOnFocus: true });
  const { data: barra  = [], mutate: mutateBarra  } = useSWR("/api/barra",        fetcher,   { revalidateOnFocus: true });
  const { data: mesas  = [], mutate: mutateMesas  } = useSWR("/api/admin/estado", fetcher,   { revalidateOnFocus: true });
  const { data: me                                } = useSWR("/api/auth/me",      fetcherMe,      { revalidateOnFocus: false });
  const { data: servicio, mutate: mutateServicio  } = useSWR("/api/admin/servicio", fetcherServicio, { revalidateOnFocus: true });
  const localId: number | null = me?.localId ?? null;
  const cajaAbierta: boolean = servicio?.cajaAbierta ?? true;
  const [toggling, setToggling] = useState(false);

  const pendientesCocina = Array.isArray(cocina) ? cocina.length : 0;
  const pendientesBarra  = Array.isArray(barra)  ? barra.length  : 0;

  // ── REFS estables ─────────────────────────────────────────────────────────
  // Permiten acceder a valores actuales desde callbacks de WebSocket
  // sin recrear el canal cuando cambian.
  const mutateRef           = useRef(mutateMesas);
  const mutateCocinaRef     = useRef(mutateCocina);
  const mutateBarraRef      = useRef(mutateBarra);
  const mesasRef            = useRef<any[]>([]);
  const prevMesasRef        = useRef<any[]>([]);
  const cuentasNotificadasRef = useRef<Set<number>>(new Set());
  const inicializado        = useRef(false);

  useEffect(() => { mutateRef.current       = mutateMesas;  }, [mutateMesas]);
  useEffect(() => { mutateCocinaRef.current = mutateCocina; }, [mutateCocina]);
  useEffect(() => { mutateBarraRef.current  = mutateBarra;  }, [mutateBarra]);
  useEffect(() => { mesasRef.current = Array.isArray(mesas) ? mesas : []; }, [mesas]);

  // ── Reconexión al volver online ───────────────────────────────────────────
  useEffect(() => {
    const refresh = () => {
      mutateRef.current();
      mutateCocinaRef.current();
      mutateBarraRef.current();
    };
    window.addEventListener("online", refresh);
    return () => window.removeEventListener("online", refresh);
  }, []);

  // ── DIFF: actualiza UI en base a cambios de SWR ───────────────────────────
  // Se usa SOLO para los toasts in-app (notify.*) cuando la pestaña está activa.
  // Las notificaciones nativas del OS se disparan desde el WebSocket (abajo),
  // así llegan aunque Chrome throttlee los fetch en background.
  // ── DIFF: audio + toasts in-app (requieren contexto React) ───────────────
useEffect(() => {
  if (!Array.isArray(mesas) || mesas.length === 0) return;

  if (!inicializado.current) {
    prevMesasRef.current = mesas;
    inicializado.current = true;
    return;
  }

  const prev = prevMesasRef.current;

  mesas.forEach((mesa: any) => {
    const anterior = prev.find((m: any) => m.id === mesa.id);

    if (!anterior && mesa.totalActual > 0) {
      audioManager.play("ding");          // ← audio aquí, funciona
      navigator.vibrate?.([200, 100, 200]);
      notify.pedido("¡Nuevo pedido!", mesa.nombre);
      return;
    }
    if (!anterior) return;

    if (mesa.totalActual > anterior.totalActual) {
      audioManager.play("ding");          // ← audio aquí, funciona
      navigator.vibrate?.([200, 100, 200]);
      notify.pedido("¡Nuevo pedido!", mesa.nombre);
    }

    if (mesa.solicitaCuenta && !anterior.solicitaCuenta) {
      if (!cuentasNotificadasRef.current.has(mesa.id)) {
        cuentasNotificadasRef.current.add(mesa.id);
        setTimeout(() => cuentasNotificadasRef.current.delete(mesa.id), 10_000);
        audioManager.play("caja");        // ← audio aquí, funciona
        navigator.vibrate?.([300, 100, 300]);
        notify.atencion("¡Piden la cuenta!", mesa.nombre);
      }
    }
  });

  prevMesasRef.current = mesas;
}, [mesas]);

  // ── CANALES SUPABASE (1 canal por tabla) ──────────────────────────────────
  // El WebSocket NO es throttleado por Chrome en pestañas de fondo.
  // Por eso las notificaciones nativas del OS se disparan aquí directamente,
  // sin esperar el fetch de SWR (que sí puede demorarse en background).

  useEffect(() => {
    if (!localId) return;

    console.log(`🔌 Conectando canal admin-pedidos-${localId}...`);

    const canal = supabase
      .channel(`admin-pedidos-${localId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Pedido", filter: `localId=eq.${localId}` },
        (payload) => {
          const eventType = payload.eventType;
          const newRecord = payload.new as PedidoPayload;
          const oldRecord = payload.old as PedidoPayload;

          console.log(`📥 [admin-pedidos] ${eventType} Pedido:`, { old: oldRecord, new: newRecord });

          if (eventType === "INSERT") {
            notificarNativo("🍽️ Nuevo pedido", "Hay un nuevo pedido esperando", "pedido-nuevo");
          }

          mutateRef.current();
          mutateCocinaRef.current();
          mutateBarraRef.current();
        }
      )
      .subscribe((status) => {
        console.log("📡 [admin-pedidos] Estado:", status);
      });

    return () => {
      console.log(`🔌 Desconectando canal admin-pedidos-${localId}`);
      supabase.removeChannel(canal);
    };
  }, [localId]);

  useEffect(() => {
    if (!localId) return;

    console.log(`🔌 Conectando canal admin-sesiones-${localId}...`);

    const canal = supabase
      .channel(`admin-sesiones-${localId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Sesion", filter: `localId=eq.${localId}` },
        (payload) => {
          const eventType = payload.eventType;
          const newRecord = payload.new as SesionPayload;
          const oldRecord = payload.old as SesionPayload;

          console.log(`📥 [admin-sesiones] ${eventType} Sesion:`, { old: oldRecord, new: newRecord });

          if (eventType !== "UPDATE") {
            mutateRef.current();
            return;
          }

          const pideCuenta = !oldRecord.solicitaCuenta && !!newRecord.solicitaCuenta;
          if (pideCuenta) {
            const mesaId = newRecord.mesaId;
            if (mesaId !== undefined) {
              if (cuentasNotificadasRef.current.has(mesaId)) return;
              cuentasNotificadasRef.current.add(mesaId);
              setTimeout(() => cuentasNotificadasRef.current.delete(mesaId), 15000);
            }
            const mesaNombre =
              mesasRef.current.find((m: any) => m.id === mesaId)?.nombre ?? (mesaId !== undefined ? `#${mesaId}` : "desconocida");
            notificarNativo("🧾 ¡Piden la cuenta!", `Mesa ${mesaNombre}`, mesaId !== undefined ? `cuenta-${mesaId}` : "cuenta");
          }

          mutateRef.current();
        }
      )
      .subscribe((status) => {
        console.log("📡 [admin-sesiones] Estado:", status);
      });

    return () => {
      console.log(`🔌 Desconectando canal admin-sesiones-${localId}`);
      supabase.removeChannel(canal);
    };
  }, [localId]);

  // ── Cierre de servicio ────────────────────────────────────────────────────
  const toggleServicio = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await fetch("/api/admin/servicio", { method: "POST" });
      await mutateServicio();
    } finally {
      setToggling(false);
    }
  };

  // ── MENÚ ──────────────────────────────────────────────────────────────────
  const menuGroups = [
    {
      label: "Operaciones",
      items: [
        { name: "Panel General",   href: "/admin",        icon: LayoutDashboard },
        { name: "Cocina",          href: "/admin/cocina", icon: ChefHat,    badge: pendientesCocina },
        { name: "Barra",           href: "/admin/barra",  icon: GlassWater, badge: pendientesBarra  },
        { name: "Mesas y Zonas",   href: "/admin/mesas",  icon: Armchair },
      ],
    },
    {
      label: "Carta",
      items: [
        { name: "Categorías",  href: "/admin/categorias", icon: Tags },
        { name: "Productos",   href: "/admin/productos",  icon: UtensilsCrossed },
        { name: "Códigos QR",  href: "/admin/qr",         icon: QrCode },
      ],
    },
    {
      label: "Negocio",
      items: [
        { name: "Historial",      href: "/admin/historial",     icon: History },
        { name: "Métricas",       href: "/admin/analytics",     icon: BarChart2 },
        { name: "Equipo",         href: "/admin/equipo",        icon: Users },
        { name: "Configuración",  href: "/admin/configuracion", icon: Settings },
      ],
    },
  ];
  const menuItems = menuGroups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-gray-50 flex transition-all duration-300">
      <Toaster />
      <NotificationsManager />

      {/* ── SIDEBAR ESCRITORIO ─────────────────────────────────────────────── */}
      <aside
        className={`
          bg-white border-r border-gray-200 hidden md:flex flex-col fixed inset-y-0 z-50
          transition-all duration-300 ease-in-out print:hidden
          ${isSidebarOpen ? "w-64" : "w-20"}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 relative bg-white z-20">
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0"}`}>
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image src="/logo-karta.png" alt="Icono" fill className="object-contain" sizes="32px" />
            </div>
            <div className="relative w-24 h-8">
              <Image src="/logo2.png" alt="KARTA" fill className="object-contain object-left" priority sizes="100px" />
            </div>
          </div>
          {!isSidebarOpen && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-10 h-10">
                <Image src="/logo-karta.png" alt="K" fill className="object-contain" sizes="40px" />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50 z-50 hidden md:flex"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <nav className="flex-1 p-3 mt-2 overflow-y-auto overflow-x-visible space-y-4">
          {menuGroups.map((group) => (
            <div key={group.label}>
              {/* Etiqueta de sección */}
              <div className={`mb-1 transition-all duration-300 ${isSidebarOpen ? "px-3" : "flex justify-center"}`}>
                {isSidebarOpen ? (
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {group.label}
                  </span>
                ) : (
                  <div className="w-6 h-px bg-gray-200" />
                )}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center rounded-xl transition-all font-bold text-sm h-10 relative group
                        ${isSidebarOpen ? "px-3 gap-3" : "justify-center px-0"}
                        ${isActive ? "bg-red-50 text-red-600 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}
                      `}
                    >
                      <div className="relative flex-shrink-0 z-10">
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        {"badge" in item && item.badge && item.badge > 0 ? (
                          <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black shadow-sm ring-2 ring-white animate-in zoom-in">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10 w-0 absolute"}`}>
                        {item.name}
                      </span>
                      {!isSidebarOpen && (
                        <div className="absolute left-full ml-4 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[100] whitespace-nowrap shadow-xl">
                          {item.name}
                          <div className="absolute top-1/2 -left-1 -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 bg-white z-20 space-y-1">
          {/* Toggle servicio abierto/cerrado */}
          <button
            onClick={toggleServicio}
            disabled={toggling}
            className={`flex items-center rounded-xl transition-colors font-bold text-sm h-12 w-full group relative ${isSidebarOpen ? "px-4 gap-3" : "justify-center px-0"} ${cajaAbierta ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : "text-red-600 bg-red-50 hover:bg-red-100"} disabled:opacity-60`}
            title={cajaAbierta ? "Servicio abierto — click para cerrar" : "Servicio cerrado — click para abrir"}
          >
            <Power size={20} className="flex-shrink-0 relative z-10" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 w-0 hidden"}`}>
              {cajaAbierta ? "Servicio abierto" : "Servicio cerrado"}
            </span>
            {!isSidebarOpen && (
              <div className="absolute left-full ml-4 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[100] whitespace-nowrap shadow-xl">
                {cajaAbierta ? "Servicio abierto" : "Servicio cerrado"}
                <div className="absolute top-1/2 -left-1 -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            )}
          </button>

          <button
            onClick={() => (window.location.href = "/api/logout")}
            className={`flex items-center rounded-xl transition-colors font-bold text-sm h-12 w-full group relative text-gray-400 hover:text-red-600 hover:bg-red-50 ${isSidebarOpen ? "px-4 gap-3" : "justify-center px-0"}`}
          >
            <LogOut size={20} className="flex-shrink-0 relative z-10" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 w-0 hidden"}`}>
              Salir
            </span>
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ───────────────────────────────────────────── */}
      <main className={`flex-1 p-4 md:p-8 transition-all duration-300 ease-in-out print:ml-0 print:p-0 pb-24 md:pb-8 ${isSidebarOpen ? "md:ml-64" : "md:ml-20"}`}>
        {children}
      </main>

      {/* ── NAVEGACIÓN MÓVIL ──────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-50 print:hidden">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
        <div className="overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex justify-start min-w-max px-2 py-2 gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[70px]
                    ${isActive ? "bg-red-600 text-white shadow-lg shadow-red-200" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 active:scale-95"}
                  `}
                >
                  <div className="relative">
                    <Icon size={20} strokeWidth={2.5} />
                    {item.badge && item.badge > 0 ? (
                      <span className={`absolute -top-1.5 -right-2 ${isActive ? "bg-white text-red-600 ring-red-600" : "bg-red-600 text-white ring-white"} text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black ring-2 animate-in zoom-in`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide whitespace-nowrap">
                    {item.name.split(" ")[0]}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex justify-center gap-1 pb-2 pt-1">
          {[...Array(Math.ceil(menuItems.length / 4))].map((_, idx) => (
            <div key={idx} className={`h-1 rounded-full transition-all ${idx === 0 ? "w-4 bg-red-600" : "w-1 bg-gray-200"}`} />
          ))}
        </div>
      </nav>
    </div>
  );
}