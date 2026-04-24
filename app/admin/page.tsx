"use client";
import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRef } from "react";
import {
  RefreshCcw,
  Filter,
  Clock,
  DollarSign,
  Store,
  Printer,
  CheckCircle2,
  X,
  HandCoins,
  Map,
  LayoutGrid,
  PenTool,
  MapPin,
  Move,
  BellRing,
  Users,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";

const MOTIVO_LABEL: Record<string, string> = {
  SERVILLETAS: "Servilletas",
  ADEREZOS: "Aderezos / condimentos",
  CUBIERTOS: "Cubiertos / utensilios",
  CONSULTA: "Tiene una consulta",
  OTRO: "Necesita atención",
};

// ─── UTILS ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) return [];
    return res.json();
  });

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const PALETA = [
  { borde: "#ef4444", fondo: "rgba(254,242,242,0.55)", titulo: "#b91c1c" },
  { borde: "#3b82f6", fondo: "rgba(239,246,255,0.55)", titulo: "#1d4ed8" },
  { borde: "#10b981", fondo: "rgba(236,253,245,0.55)", titulo: "#065f46" },
  { borde: "#f59e0b", fondo: "rgba(255,251,235,0.55)", titulo: "#92400e" },
  { borde: "#8b5cf6", fondo: "rgba(245,243,255,0.55)", titulo: "#5b21b6" },
  { borde: "#14b8a6", fondo: "rgba(240,253,250,0.55)", titulo: "#0f766e" },
];

const METODO_CONFIG: Record<
  string,
  {
    emoji: string;
    label: string;
    labelCorto: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  QR: {
    emoji: "📱",
    label: "Pago con QR / Digital",
    labelCorto: "QR",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  TARJETA: {
    emoji: "💳",
    label: "Pago con tarjeta — llevá el POS",
    labelCorto: "Tarjeta",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  EFECTIVO: {
    emoji: "💵",
    label: "Pago en efectivo — llevá cambio",
    labelCorto: "Efectivo",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
};

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface ZonaRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── COMPONENTE: MAPA CANVAS ─────────────────────────────────────────────────

function MapCanvas({
  zonasLayout,
  sectoresConZona,
  mesasFiltradas,
  filtroSector,
  colorDe,
  setMesaParaCobrar,
}: {
  zonasLayout: Record<string, ZonaRect>;
  sectoresConZona: any[];
  mesasFiltradas: any[];
  filtroSector: string;
  colorDe: (n: string) => (typeof PALETA)[0];
  setMesaParaCobrar: (m: any) => void;
}) {
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const panning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const didMove = useRef(false);

  const startPan = (
    clientX: number,
    clientY: number,
    target: EventTarget | null,
  ) => {
    if ((target as HTMLElement)?.closest("[data-mesa]")) return;
    panning.current = true;
    didMove.current = false;
    lastPos.current = { x: clientX, y: clientY };
  };
  const movePan = (clientX: number, clientY: number) => {
    if (!panning.current) return;
    const dx = clientX - lastPos.current.x;
    const dy = clientY - lastPos.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didMove.current = true;
    lastPos.current = { x: clientX, y: clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };
  const endPan = () => {
    panning.current = false;
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none bg-[#e8ecf0]"
      style={{ cursor: "grab", touchAction: "none" }}
      onMouseDown={(e) => {
        e.preventDefault();
        startPan(e.clientX, e.clientY, e.target);
      }}
      onMouseMove={(e) => movePan(e.clientX, e.clientY)}
      onMouseUp={endPan}
      onMouseLeave={endPan}
      onTouchStart={(e) => {
        if (e.touches.length === 1)
          startPan(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 1)
          movePan(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchEnd={endPan}
    >
      <div
        style={{
          position: "absolute",
          width: 4000,
          height: 4000,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          willChange: "transform",
        }}
      >
        {/* Cuadrícula */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.06) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* ZONAS */}
        {sectoresConZona
          .filter((s) => filtroSector === "Todos" || s.nombre === filtroSector)
          .map((s) => {
            const zona = zonasLayout[s.nombre];
            const color = colorDe(s.nombre);
            return (
              <div
                key={s.nombre}
                className="absolute pointer-events-none"
                style={{
                  left: zona.x,
                  top: zona.y,
                  width: zona.w,
                  height: zona.h,
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 20,
                    background: color.fondo,
                    border: `2px dashed ${color.borde}`,
                    boxShadow: `inset 0 0 40px ${color.borde}18`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 20,
                    opacity: 0.15,
                    backgroundImage: `radial-gradient(circle, ${color.borde} 1px, transparent 1px)`,
                    backgroundSize: "22px 22px",
                  }}
                />
                {(
                  [
                    {
                      top: -2,
                      left: -2,
                      bt: `3px solid ${color.borde}`,
                      bl: `3px solid ${color.borde}`,
                      br: "5px 0 0 0",
                    },
                    {
                      top: -2,
                      right: -2,
                      bt: `3px solid ${color.borde}`,
                      br2: `3px solid ${color.borde}`,
                      br: "0 5px 0 0",
                    },
                    {
                      bottom: -2,
                      left: -2,
                      bb: `3px solid ${color.borde}`,
                      bl: `3px solid ${color.borde}`,
                      br: "0 0 0 5px",
                    },
                    {
                      bottom: -2,
                      right: -2,
                      bb: `3px solid ${color.borde}`,
                      br2: `3px solid ${color.borde}`,
                      br: "0 0 5px 0",
                    },
                  ] as any[]
                ).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      width: 22,
                      height: 22,
                      top: c.top,
                      left: c.left,
                      right: c.right,
                      bottom: c.bottom,
                      borderTop: c.bt,
                      borderBottom: c.bb,
                      borderLeft: c.bl,
                      borderRight: c.br2,
                      borderRadius: c.br,
                    }}
                  />
                ))}
                <div style={{ position: "absolute", top: -22, left: 12 }}>
                  <span
                    style={{
                      background: color.borde,
                      color: "#fff",
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      boxShadow: `0 2px 8px ${color.borde}44`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <MapPin size={10} strokeWidth={3} /> {s.nombre}
                  </span>
                </div>
              </div>
            );
          })}

        {/* MESAS */}
        {mesasFiltradas.map((mesa: any) => {
          const metodo = mesa.metodoPago
            ? METODO_CONFIG[mesa.metodoPago]
            : null;
          return (
            <div
              key={mesa.id}
              data-mesa="true"
              style={{
                position: "absolute",
                left: mesa.posX || 0,
                top: mesa.posY || 0,
                zIndex: 10,
              }}
              onClick={() => {
                if (!didMove.current && mesa.estado === "OCUPADA")
                  setMesaParaCobrar(mesa);
              }}
            >
              <div
                className={`w-24 h-24 rounded-2xl shadow-lg border-2 flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform relative bg-white ${mesa.solicitaCuenta ? "border-yellow-500 ring-4 ring-yellow-200 ring-opacity-70 animate-pulse" : mesa.estado === "OCUPADA" ? "border-red-400 text-red-600" : "border-gray-300 text-gray-400 opacity-50"}`}
              >
                <div className="absolute -top-2.5 w-10 h-2.5 bg-gray-300 rounded-full pointer-events-none" />
                <div className="absolute -bottom-2.5 w-10 h-2.5 bg-gray-300 rounded-full pointer-events-none" />
                <div className="absolute -left-2.5 h-10 w-2.5 bg-gray-300 rounded-full pointer-events-none" />
                <div className="absolute -right-2.5 h-10 w-2.5 bg-gray-300 rounded-full pointer-events-none" />
                {mesa.solicitaCuenta && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 bg-yellow-500 text-white text-[9px] font-black px-2 py-1 rounded-full animate-bounce whitespace-nowrap shadow-lg flex items-center gap-1">
                    <HandCoins size={10} /> PIDE CUENTA
                  </div>
                )}
                <span className="font-black text-lg leading-none">
                  {mesa.nombre}
                </span>
                {mesa.estado === "OCUPADA" && (
                  <span className="text-xs font-bold mt-1.5 text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                    ${mesa.totalActual}
                  </span>
                )}
                {metodo && mesa.solicitaCuenta && (
                  <div
                    className={`absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm text-white ${mesa.metodoPago === "QR" ? "bg-blue-500" : mesa.metodoPago === "TARJETA" ? "bg-purple-500" : "bg-green-600"}`}
                  >
                    {metodo.emoji} {metodo.labelCorto}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-full pointer-events-none flex items-center gap-1.5">
        <Move size={11} /> Arrastrá para moverte
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL: DASHBOARD ─────────────────────────────────────────

export default function AdminDashboard() {
  const [filtroSector, setFiltroSector] = useState("Todos");
  const [mesaParaCobrar, setMesaParaCobrar] = useState<any>(null);
  const [splitN, setSplitN] = useState(1);
  const [propinaOverride, setPropinaOverride] = useState<string>("");
  const [vistaMapa, setVistaMapa] = useState(false);
  const [zonasLayout, setZonasLayout] = useState<Record<string, ZonaRect>>({});

  // SWR — usa la misma key que el layout, comparte caché automáticamente
  const {
    data: mesas = [],
    mutate,
    isLoading: cargando,
  } = useSWR("/api/admin/estado", fetcher, {
    revalidateOnFocus: true,
    fallbackData: [],
  });
  const { data: sectoresRaw } = useSWR("/api/admin/sectores", fetcher, {
    fallbackData: [],
  });
  const sectores: any[] = Array.isArray(sectoresRaw) ? sectoresRaw : [];

  // Mapa: cargar layout de zonas al abrir
  const handleAbrirMapa = () => {
    setVistaMapa(true);
    fetch("/api/admin/sectores/layout")
      .then((r) => r.json())
      .then((d) => setZonasLayout(d || {}))
      .catch(() => {});
  };

  // Reset split/propina cuando cambia la mesa seleccionada
  useEffect(() => {
    setSplitN(1);
    setPropinaOverride("");
  }, [mesaParaCobrar?.sesionId]);

  // ── HELPERS ────────────────────────────────────────────────────────────────

  const colorDe = (nombre: string) => {
    const idx = sectores.findIndex((s: any) => s.nombre === nombre);
    return PALETA[(idx < 0 ? 0 : idx) % PALETA.length];
  };

  const imprimirTicketCierre = (mesa: any) => {
    const v = window.open("", "PRINT", "height=600,width=400");
    if (!v) return;
    const propina = mesa.propina ?? 0;
    const splitN = mesa.splitN ?? 1;
    const porPersona = mesa.porPersona ?? null;
    v.document.write(`
      <html><head><title>Ticket ${mesa.nombre}</title>
      <style>
        body { font-family:'Courier New',monospace; padding:10px; width:300px; margin:0 auto; text-transform:uppercase; }
        .hdr { text-align:center; border-bottom:2px dashed #000; padding-bottom:10px; margin-bottom:10px; }
        .item { display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px; }
        .sub { display:flex; justify-content:space-between; font-size:12px; margin-top:4px; }
        .tot { border-top:2px dashed #000; padding-top:10px; margin-top:10px; display:flex; justify-content:space-between; font-weight:bold; font-size:16px; }
        .split { border-top:2px dashed #000; padding-top:8px; margin-top:8px; text-align:center; font-size:14px; font-weight:bold; }
        .ftr { text-align:center; font-size:10px; margin-top:20px; }
      </style></head><body>
      <div class="hdr">
        <h1 style="font-size:20px;font-weight:bold;margin:0">KARTA RESTO</h1>
        <div>PRE-CUENTA</div><div>MESA: ${mesa.nombre}</div>
        <div>${new Date().toLocaleString()}</div>
      </div>
      ${mesa.detalles?.map((d: any) => `<div class="item"><span>${d.cantidad} x ${d.producto}</span><span>$${d.subtotal}</span></div>`).join("") || '<div style="text-align:center">Detalle no disponible</div>'}
      ${propina > 0 ? `<div class="sub"><span>PROPINA</span><span>+$${propina}</span></div>` : ""}
      <div class="tot"><span>TOTAL</span><span>$${mesa.totalActual}</span></div>
      ${splitN > 1 && porPersona ? `<div class="split">÷ ${splitN} PERSONAS = $${porPersona} C/U</div>` : ""}
      <div class="ftr">NO VALIDO COMO FACTURA<br/>GRACIAS POR SU VISITA</div>
      </body></html>
    `);
    v.document.close();
    v.focus();
    v.print();
    v.close();
  };

  const ejecutarCierre = async () => {
    if (!mesaParaCobrar) return;
    const propinaCliente = mesaParaCobrar.propina ?? 0;
    const propinaFinal = propinaOverride !== "" ? Math.max(0, Number(propinaOverride) || 0) : propinaCliente;
    const tid = toast.loading("Cerrando mesa...");
    try {
      const res = await fetch("/api/admin/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesionId: mesaParaCobrar.sesionId, propina: propinaFinal }),
      });
      if (res.ok) {
        toast.success("Mesa cerrada 💰", { id: tid });
        mutate();
        setMesaParaCobrar(null);
      } else {
        toast.error("Error al cerrar", { id: tid });
      }
    } catch {
      toast.error("Error de conexión", { id: tid });
    }
  };

  // ── MEMOS ──────────────────────────────────────────────────────────────────

  const mesasFiltradas = useMemo(() => {
    if (!Array.isArray(mesas)) return [];
    return filtroSector === "Todos"
      ? mesas
      : mesas.filter((m: any) => m.sector === filtroSector);
  }, [mesas, filtroSector]);

  const sectoresConZona = useMemo(
    () => sectores.filter((s) => !!zonasLayout[s.nombre]),
    [sectores, zonasLayout],
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── MAPA FULL-SCREEN OVERLAY ─────────────────────────────────────── */}
      {vistaMapa && (
        <div className="fixed inset-0 z-50 bg-[#e8ecf0]">
          <div className="absolute top-4 left-4 right-4 z-50 flex items-center gap-3">
            <div className="bg-white/95 backdrop-blur-md shadow-lg border border-white/60 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 shrink-0">
              <Store className="text-red-600" size={18} />
              <span className="font-black text-gray-800 text-sm hidden sm:block">
                Control de Salón
              </span>
            </div>
            <div className="bg-white/95 backdrop-blur-md shadow-lg border border-white/60 rounded-2xl px-3 py-2 flex items-center gap-2">
              <Filter size={14} className="text-gray-400 shrink-0" />
              <select
                className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer pr-1 max-w-[140px]"
                value={filtroSector}
                onChange={(e) => setFiltroSector(e.target.value)}
              >
                <option value="Todos">Todos los sectores</option>
                {sectores.map((s: any) => (
                  <option key={s.id} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-white/95 backdrop-blur-md shadow-lg border border-white/60 rounded-2xl px-3 py-2.5 hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-black text-gray-700">
                {mesasFiltradas.length}
              </span>
              <span className="text-xs text-gray-400 font-medium">mesas</span>
              {mesasFiltradas.filter((m: any) => m.estado === "OCUPADA")
                .length > 0 && (
                <>
                  <div className="h-3 w-px bg-gray-200 mx-1" />
                  <span className="text-xs font-black text-red-500">
                    {
                      mesasFiltradas.filter((m: any) => m.estado === "OCUPADA")
                        .length
                    }
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    ocupadas
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => mutate()}
              className="bg-white/95 backdrop-blur-md shadow-lg border border-white/60 rounded-2xl p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50/80 transition-all active:scale-95"
            >
              <RefreshCcw
                size={18}
                className={cargando ? "animate-spin" : ""}
              />
            </button>
            <div className="flex-1" />
            <Link href="/admin/mesas/mapa">
              <button
                className="bg-white/95 backdrop-blur-md shadow-lg border border-white/60 rounded-2xl p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50/80 transition-all active:scale-95"
                title="Editar mapa"
              >
                <PenTool size={18} />
              </button>
            </Link>
            <button
              onClick={() => setVistaMapa(false)}
              className="bg-white/95 backdrop-blur-md shadow-lg border border-white/60 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-gray-700 font-bold text-sm hover:bg-red-50/80 hover:text-red-600 transition-all active:scale-95"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Ver Lista</span>
              <X size={14} className="opacity-50" />
            </button>
          </div>
          <MapCanvas
            zonasLayout={zonasLayout}
            sectoresConZona={sectoresConZona}
            mesasFiltradas={mesasFiltradas}
            filtroSector={filtroSector}
            colorDe={colorDe}
            setMesaParaCobrar={setMesaParaCobrar}
          />
        </div>
      )}

      {/* ── VISTA LISTA ──────────────────────────────────────────────────── */}
      <div className="space-y-6 relative flex flex-col w-full max-w-[100vw] overflow-x-hidden">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Store className="text-red-600" size={24} /> Control de Salón
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-1">
              {cargando
                ? "Sincronizando..."
                : `${mesasFiltradas.length} mesas activas`}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Link href="/admin/mesas/mapa">
              <button
                className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition-colors shadow-sm group active:scale-95"
                title="Editar distribución"
              >
                <PenTool
                  size={18}
                  className="group-hover:scale-110 transition-transform"
                />
              </button>
            </Link>
            <button
              onClick={handleAbrirMapa}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-bold flex gap-2 items-center text-gray-700 transition-colors shadow-sm active:scale-95"
            >
              <Map size={18} />
              <span className="hidden sm:inline">Ver Mapa</span>
            </button>
            <div className="relative flex-1 sm:flex-none">
              <Filter
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <select
                className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base md:text-sm font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-100 transition-colors appearance-none"
                value={filtroSector}
                onChange={(e) => setFiltroSector(e.target.value)}
              >
                <option value="Todos">Todos los sectores</option>
                {sectores.map((s: any) => (
                  <option key={s.id} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => mutate()}
              className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCcw
                size={20}
                className={cargando ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        {/* GRID DE MESAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          {mesasFiltradas.map((mesa: any) => {
            const metodo = mesa.metodoPago
              ? METODO_CONFIG[mesa.metodoPago]
              : null;
            return (
              <div
                key={mesa.id}
                className={`relative p-5 rounded-2xl border transition-all duration-300 ${
                  mesa.solicitaCuenta
                    ? "bg-yellow-50 border-yellow-400 shadow-xl shadow-yellow-100 ring-2 ring-yellow-400 ring-offset-2 animate-pulse"
                    : mesa.llamadaMozo
                      ? "bg-orange-50 border-orange-300 shadow-xl shadow-orange-100 ring-2 ring-orange-300 ring-offset-2"
                      : mesa.estado === "OCUPADA"
                        ? "bg-white border-red-100 shadow-lg shadow-red-50 hover:shadow-xl hover:-translate-y-1"
                        : "bg-white border-dashed border-gray-200 opacity-60 hover:opacity-100 hover:border-green-200"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-800 leading-tight">
                      {mesa.nombre}
                    </h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {mesa.sector}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${mesa.solicitaCuenta ? "bg-yellow-400 text-yellow-900" : mesa.estado === "OCUPADA" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                  >
                    {mesa.solicitaCuenta ? "PIDIENDO" : mesa.estado}
                  </span>
                </div>

                {mesa.solicitaCuenta && (
                  <div className="bg-yellow-400 text-yellow-900 px-3 py-2 rounded-lg font-black text-xs uppercase tracking-wide mb-4 flex items-center gap-2 justify-center animate-bounce shadow-sm">
                    <HandCoins size={14} /> ¡PIDE CUENTA!
                  </div>
                )}

                {mesa.llamadaMozo && !mesa.solicitaCuenta && (
                  <div className="bg-orange-500 text-white px-3 py-2 rounded-lg font-black text-xs uppercase tracking-wide mb-4 flex items-center gap-2 justify-center animate-pulse shadow-sm">
                    <BellRing size={14} /> {MOTIVO_LABEL[mesa.llamadaMozo] ?? "Necesita atención"}
                  </div>
                )}

                {mesa.estado === "OCUPADA" ? (
                  <>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          <span>
                            {new Date(mesa.horaInicio).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {metodo && (
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wide ${metodo.bg} ${metodo.text}`}
                          >
                            <span>{metodo.emoji}</span>
                            {metodo.labelCorto}
                          </div>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between pt-3 border-t border-dashed border-gray-100">
                        <span className="text-xs font-bold text-gray-400 uppercase">
                          Total
                        </span>
                        <div className="flex items-center text-gray-900">
                          <DollarSign
                            size={16}
                            className="text-gray-400"
                            strokeWidth={3}
                          />
                          <span className="text-2xl font-black">
                            {mesa.totalActual}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setMesaParaCobrar(mesa)}
                      className={`w-full py-2.5 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all ${mesa.solicitaCuenta ? "bg-yellow-500 hover:bg-yellow-600 text-yellow-950" : "bg-gray-900 hover:bg-black"}`}
                    >
                      COBRAR MESA
                    </button>
                  </>
                ) : (
                  <div className="h-24 flex flex-col items-center justify-center text-gray-300">
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Disponible
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL COBRO ──────────────────────────────────────────────────── */}
      {mesaParaCobrar &&
        (() => {
          const metodo = mesaParaCobrar.metodoPago
            ? METODO_CONFIG[mesaParaCobrar.metodoPago]
            : null;
          const propinaCliente = mesaParaCobrar.propina ?? 0;
          const propinaFinal = propinaOverride !== ""
            ? Math.max(0, Number(propinaOverride) || 0)
            : propinaCliente;
          const subtotal = mesaParaCobrar.totalActual ?? 0;
          const totalConPropina = subtotal + propinaFinal;
          const porPersona = splitN > 1 ? Math.ceil(totalConPropina / splitN) : null;

          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-red-600 p-6 text-white text-center relative shrink-0">
                  <button
                    onClick={() => setMesaParaCobrar(null)}
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full active:scale-95"
                  >
                    <X size={20} />
                  </button>
                  <h3 className="text-2xl font-black uppercase tracking-tight">
                    Mesa {mesaParaCobrar.nombre}
                  </h3>
                  <p className="text-red-100 text-sm font-medium mt-1">
                    {mesaParaCobrar.sector || ""}
                  </p>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                  {/* Detalle de items */}
                  {mesaParaCobrar.detalles?.length > 0 && (
                    <div className="bg-gray-50 rounded-2xl p-4 max-h-32 overflow-y-auto space-y-2">
                      {mesaParaCobrar.detalles.map((d: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">
                            <span className="font-black text-gray-800">{d.cantidad}x</span>{" "}{d.producto}
                          </span>
                          <span className="font-bold text-gray-800">${d.subtotal}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Subtotal + propina + total */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Subtotal</span>
                      <span className="font-bold text-gray-800">${subtotal}</span>
                    </div>

                    {/* Propina */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium flex items-center gap-1.5">
                        Propina
                        {propinaCliente > 0 && propinaOverride === "" && (
                          <span className="text-[10px] bg-green-100 text-green-700 font-black px-1.5 py-0.5 rounded-full">
                            cliente
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {propinaOverride !== "" ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            value={propinaOverride}
                            onChange={(e) => setPropinaOverride(e.target.value)}
                            className="w-20 text-right border-2 border-slate-900 rounded-lg px-2 py-0.5 text-sm font-black focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className={`font-bold ${propinaFinal > 0 ? "text-green-700" : "text-gray-400"}`}>
                            {propinaFinal > 0 ? `+$${propinaFinal}` : "—"}
                          </span>
                        )}
                        <button
                          onClick={() => setPropinaOverride(propinaOverride !== "" ? "" : String(propinaFinal))}
                          className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Pencil size={12} className="text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
                      <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total</span>
                      <span className="text-3xl font-black text-gray-900">${totalConPropina}</span>
                    </div>
                  </div>

                  {/* División de cuenta */}
                  <div className="bg-blue-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                        <Users size={13} /> Dividir cuenta
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSplitN(Math.max(1, splitN - 1))}
                          className="w-8 h-8 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center font-black text-blue-700 hover:bg-blue-100 active:scale-95 transition-all"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <span className="w-8 text-center font-black text-lg text-blue-900">{splitN}</span>
                        <button
                          onClick={() => setSplitN(Math.min(20, splitN + 1))}
                          className="w-8 h-8 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center font-black text-blue-700 hover:bg-blue-100 active:scale-95 transition-all"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                    </div>
                    {porPersona ? (
                      <div className="text-center">
                        <span className="text-3xl font-black text-blue-900">${porPersona}</span>
                        <span className="text-blue-600 font-bold text-sm ml-1">por persona</span>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-blue-400 font-medium">Pago único — subí para dividir</p>
                    )}
                  </div>

                  {/* Método de pago */}
                  {metodo ? (
                    <div className={`flex items-center gap-3 py-3 px-4 rounded-2xl border-2 font-black text-sm ${metodo.bg} ${metodo.border} ${metodo.text}`}>
                      <span className="text-2xl">{metodo.emoji}</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Método elegido</p>
                        {metodo.label}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-bold">
                      <HandCoins size={16} /> Método de pago no seleccionado aún
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => imprimirTicketCierre({ ...mesaParaCobrar, totalActual: totalConPropina, propina: propinaFinal, splitN, porPersona })}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group active:scale-95"
                    >
                      <Printer size={28} className="text-gray-400 group-hover:text-gray-600" />
                      <span className="font-bold text-gray-600 text-xs">Imprimir Ticket</span>
                    </button>
                    <button
                      onClick={ejecutarCierre}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-green-50 border-2 border-green-100 hover:bg-green-100 hover:border-green-200 transition-all group active:scale-95"
                    >
                      <CheckCircle2 size={28} className="text-green-600 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-green-700 text-xs">Cerrar y Liberar</span>
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 font-medium border-t border-gray-100 shrink-0">
                  Al cerrar, la mesa quedará disponible para nuevos clientes.
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
