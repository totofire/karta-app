"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Draggable from "react-draggable";
import toast from "react-hot-toast";
import {
  Save, ArrowLeft, LayoutGrid, Move, AlertCircle,
  MapPin, Lock, Unlock, Eye, EyeOff, Layers,
} from "lucide-react";
import Link from "next/link";

interface ZonaRect { x: number; y: number; w: number; h: number }
interface Mesa     { id: number; nombre: string; sector: string | null; posX: number; posY: number }
interface Sector   { id: number; nombre: string }

const PALETA = [
  { borde: "#ef4444", fondo: "rgba(254,242,242,0.60)", titulo: "#b91c1c" },
  { borde: "#3b82f6", fondo: "rgba(239,246,255,0.60)", titulo: "#1d4ed8" },
  { borde: "#10b981", fondo: "rgba(236,253,245,0.60)", titulo: "#065f46" },
  { borde: "#f59e0b", fondo: "rgba(255,251,235,0.60)", titulo: "#92400e" },
  { borde: "#8b5cf6", fondo: "rgba(245,243,255,0.60)", titulo: "#5b21b6" },
  { borde: "#14b8a6", fondo: "rgba(240,253,250,0.60)", titulo: "#0f766e" },
];

function ZonaEditor({ nombre, rect, color, seleccionada, bloqueada, onSelect, onChange }: {
  nombre: string; rect: ZonaRect; color: typeof PALETA[0];
  seleccionada: boolean; bloqueada: boolean;
  onSelect: () => void; onChange: (r: ZonaRect) => void;
}) {
  const boxRef   = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const startResize = useCallback((e: React.MouseEvent, dir: string) => {
    e.stopPropagation(); e.preventDefault();
    const base = { ...rect };
    const ox = e.clientX, oy = e.clientY;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - ox, dy = ev.clientY - oy;
      let { x, y, w, h } = base;
      if (dir.includes("e")) w = Math.max(140, base.w + dx);
      if (dir.includes("s")) h = Math.max(100, base.h + dy);
      if (dir.includes("w")) { x = base.x + dx; w = Math.max(140, base.w - dx); }
      if (dir.includes("n")) { y = base.y + dy; h = Math.max(100, base.h - dy); }
      onChange({ x, y, w, h });
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [rect, onChange]);

  const hs: React.CSSProperties = {
    position: "absolute", width: 14, height: 14,
    background: color.borde, border: "2.5px solid #fff",
    borderRadius: 4, zIndex: 30,
    opacity: seleccionada && !bloqueada ? 1 : 0,
    pointerEvents: seleccionada && !bloqueada ? "auto" : "none",
    transition: "opacity .15s",
  };

  return (
    <Draggable
      nodeRef={boxRef} disabled={bloqueada}
      position={{ x: rect.x, y: rect.y }}
      onStart={() => { dragging.current = false; }}
      onDrag={() => { dragging.current = true; }}
      onStop={(_e, ui) => { if (dragging.current) onChange({ ...rect, x: ui.x, y: ui.y }); }}
      bounds="parent" grid={[10, 10]}
    >
      <div ref={boxRef} onClick={(e) => { e.stopPropagation(); onSelect(); }}
        style={{ position:"absolute", width:rect.w, height:rect.h,
          cursor: bloqueada ? "default" : "grab", userSelect:"none", zIndex: seleccionada ? 20 : 5 }}>
        <div style={{
          position:"absolute", inset:0, borderRadius:20, background:color.fondo,
          border:`2.5px ${seleccionada ? "solid" : "dashed"} ${color.borde}`,
          boxShadow: seleccionada ? `0 0 0 4px ${color.borde}28` : "none",
          transition:"border .15s, box-shadow .15s",
        }} />
        <div style={{
          position:"absolute", inset:0, borderRadius:20, opacity:.15, pointerEvents:"none",
          backgroundImage:`radial-gradient(circle, ${color.borde} 1.2px, transparent 1.2px)`,
          backgroundSize:"22px 22px",
        }} />
        {([
          { top:-2, left:-2,    bt:`4px solid ${color.borde}`, bl:`4px solid ${color.borde}`,  br:"6px 0 0 0" },
          { top:-2, right:-2,   bt:`4px solid ${color.borde}`, br2:`4px solid ${color.borde}`, br:"0 6px 0 0" },
          { bottom:-2, left:-2, bb:`4px solid ${color.borde}`, bl:`4px solid ${color.borde}`,  br:"0 0 0 6px" },
          { bottom:-2, right:-2,bb:`4px solid ${color.borde}`, br2:`4px solid ${color.borde}`, br:"0 0 6px 0" },
        ] as any[]).map((c, i) => (
          <div key={i} style={{
            position:"absolute", width:26, height:26,
            top:c.top, left:c.left, right:c.right, bottom:c.bottom,
            borderTop:c.bt, borderBottom:c.bb, borderLeft:c.bl, borderRight:c.br2,
            borderRadius:c.br, pointerEvents:"none",
          }} />
        ))}
        <div style={{ position:"absolute", top:-20, left:12, pointerEvents:"none", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{
            background:color.borde, color:"#fff", borderRadius:20, padding:"3px 10px",
            fontSize:11, fontWeight:900, letterSpacing:".08em", textTransform:"uppercase",
            display:"flex", alignItems:"center", gap:5, boxShadow:`0 2px 8px ${color.borde}44`,
          }}>
            <MapPin size={10} strokeWidth={3}/>{nombre}
          </span>
          {bloqueada && (
            <span style={{ background:"#374151", color:"#fff", borderRadius:20, padding:"3px 7px", fontSize:9, fontWeight:800, letterSpacing:".1em", textTransform:"uppercase" }}>
              FIJO
            </span>
          )}
        </div>
        <div onMouseDown={e=>startResize(e,"n")}  style={{...hs, top:-7,    left:"50%", transform:"translateX(-50%)", cursor:"ns-resize"}} />
        <div onMouseDown={e=>startResize(e,"s")}  style={{...hs, bottom:-7, left:"50%", transform:"translateX(-50%)", cursor:"ns-resize"}} />
        <div onMouseDown={e=>startResize(e,"e")}  style={{...hs, right:-7,  top:"50%",  transform:"translateY(-50%)", cursor:"ew-resize"}} />
        <div onMouseDown={e=>startResize(e,"w")}  style={{...hs, left:-7,   top:"50%",  transform:"translateY(-50%)", cursor:"ew-resize"}} />
        <div onMouseDown={e=>startResize(e,"ne")} style={{...hs, top:-7,    right:-7,  cursor:"nesw-resize"}} />
        <div onMouseDown={e=>startResize(e,"nw")} style={{...hs, top:-7,    left:-7,   cursor:"nwse-resize"}} />
        <div onMouseDown={e=>startResize(e,"se")} style={{...hs, bottom:-7, right:-7,  cursor:"nwse-resize"}} />
        <div onMouseDown={e=>startResize(e,"sw")} style={{...hs, bottom:-7, left:-7,   cursor:"nesw-resize"}} />
      </div>
    </Draggable>
  );
}

function MesaDraggable({ mesa, onDragStop, colorBorde }: {
  mesa: Mesa; onDragStop: (e:any, ui:any, id:number) => void; colorBorde: string;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  return (
    <Draggable nodeRef={nodeRef} position={{ x:mesa.posX, y:mesa.posY }}
      onStop={(e,ui) => onDragStop(e,ui,mesa.id)} bounds="parent" grid={[20,20]}>
      <div ref={nodeRef} className="absolute cursor-grab active:cursor-grabbing group" style={{ width:96, height:96, zIndex:50 }}>
        <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center relative select-none"
          style={{ background:"#fff", border:`2.5px solid ${colorBorde}55`, boxShadow:`0 4px 16px ${colorBorde}22` }}>
          <div className="absolute -top-2.5 w-11 h-2.5 bg-gray-200 rounded-full" />
          <div className="absolute -bottom-2.5 w-11 h-2.5 bg-gray-200 rounded-full" />
          <div className="absolute -left-2.5 h-11 w-2.5 bg-gray-200 rounded-full" />
          <div className="absolute -right-2.5 h-11 w-2.5 bg-gray-200 rounded-full" />
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ border:`2.5px solid ${colorBorde}`, boxShadow:`0 0 0 4px ${colorBorde}22` }} />
          <Move size={10} className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color:colorBorde }} />
          <span className="font-black text-gray-800 text-sm leading-none">{mesa.nombre}</span>
          {mesa.sector && (
            <span className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-50" style={{ color:colorBorde }}>{mesa.sector}</span>
          )}
        </div>
      </div>
    </Draggable>
  );
}

export default function EditorMapaPage() {
  const [mesas,        setMesas]        = useState<Mesa[]>([]);
  const [sectores,     setSectores]     = useState<Sector[]>([]);
  const [zonas,        setZonas]        = useState<Record<string, ZonaRect>>({});
  const [cargando,     setCargando]     = useState(true);
  const [cambios,      setCambios]      = useState(false);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [ocultas,      setOcultas]      = useState<Set<string>>(new Set());
  const [bloqueadas,   setBloqueadas]   = useState<Set<string>>(new Set());

  const colorDe = (nombre: string) => {
    const idx = sectores.findIndex(s => s.nombre === nombre);
    return PALETA[(idx < 0 ? 0 : idx) % PALETA.length];
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/mesas").then(r => r.json()),
      fetch("/api/admin/sectores").then(r => r.json()),
      fetch("/api/admin/sectores/layout").then(r => r.json()),
    ]).then(([dm, ds, dl]) => {
      setMesas((dm as any[]).map(m => ({
        id:m.id, nombre:m.nombre, sector:m.sector??"General",
        posX:m.posX??100, posY:m.posY??100,
      })));
      const ss: Sector[] = ds;
      setSectores(ss);
      const base: Record<string, ZonaRect> = dl || {};
      const final: Record<string, ZonaRect> = {};
      ss.forEach((s, i) => {
        final[s.nombre] = base[s.nombre] ?? {
          x: 80+(i%3)*420, y: 80+Math.floor(i/3)*340, w:360, h:280,
        };
      });
      setZonas(final);
      setCargando(false);
    });
  }, []);

  const handleMesaDrag = (_e: any, ui: any, id: number) => {
    setMesas(prev => prev.map(m => m.id===id ? {...m, posX:ui.x, posY:ui.y} : m));
    setCambios(true);
  };

  const handleZonaChange = (nombre: string, rect: ZonaRect) => {
    setZonas(prev => ({...prev, [nombre]:rect}));
    setCambios(true);
  };

  const guardar = async () => {
    const tid = toast.loading("Guardando mapa...");
    try {
      await Promise.all([
        fetch("/api/admin/mesas/posiciones", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ posiciones: mesas.map(m => ({id:m.id, x:m.posX, y:m.posY})) }),
        }),
        fetch("/api/admin/sectores/layout", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ zonas }),
        }),
      ]);
      toast.success("¡Mapa guardado!", { id:tid });
      setCambios(false);
    } catch { toast.error("Error al guardar", { id:tid }); }
  };

  const toggle = (set: Set<string>, fn:(s:Set<string>)=>void, key:string) => {
    const s = new Set(set); s.has(key) ? s.delete(key) : s.add(key); fn(s);
  };

  if (cargando) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#e8ecf0]">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm font-bold uppercase tracking-widest">Cargando plano...</span>
      </div>
    </div>
  );

  return (
    // ── fixed inset-0 z-50: tapa el sidebar, canvas full-screen ──────────────
    <div className="fixed inset-0 z-50 bg-[#e8ecf0] flex flex-col">

      {/* HEADER */}
      <div className="bg-white/95 backdrop-blur-md px-5 py-3 border-b border-gray-200 shadow-sm z-50 shrink-0 flex items-center gap-4">
        <Link href="/admin/mesas" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Volver">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-black text-gray-800 flex items-center gap-2 leading-none">
            <LayoutGrid className="text-blue-600" size={20} />
            Editor de Salón
          </h1>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Las <b>zonas</b> se mueven y redimensionan independientemente de las mesas
          </p>
        </div>

        <div className="h-8 w-px bg-gray-200 mx-1" />

        {/* Chips de sector */}
        <div className="flex items-center gap-2 flex-1 flex-wrap overflow-hidden">
          {sectores.map(s => {
            const c     = colorDe(s.nombre);
            const sel   = seleccionada === s.nombre;
            const ocult = ocultas.has(s.nombre);
            const bloq  = bloqueadas.has(s.nombre);
            return (
              <div key={s.id}
                onClick={() => setSeleccionada(sel ? null : s.nombre)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer select-none text-xs font-bold transition-all"
                style={{
                  borderColor: c.borde,
                  background:  sel ? c.borde : c.fondo,
                  color:       sel ? "#fff"  : c.titulo,
                  boxShadow:   sel ? `0 2px 10px ${c.borde}44` : "none",
                }}
              >
                <Layers size={12}/>
                {s.nombre}
                <button onClick={e=>{e.stopPropagation();toggle(ocultas,setOcultas,s.nombre);}}
                  className="ml-1 opacity-70 hover:opacity-100 transition-opacity" title={ocult?"Mostrar":"Ocultar"}>
                  {ocult ? <EyeOff size={12}/> : <Eye size={12}/>}
                </button>
                <button onClick={e=>{e.stopPropagation();toggle(bloqueadas,setBloqueadas,s.nombre);}}
                  className="opacity-70 hover:opacity-100 transition-opacity" title={bloq?"Desbloquear":"Bloquear"}>
                  {bloq ? <Lock size={12}/> : <Unlock size={12}/>}
                </button>
              </div>
            );
          })}
        </div>

        {/* Guardar */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          {cambios && (
            <div className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-yellow-100 animate-pulse">
              <AlertCircle size={13}/> Sin guardar
            </div>
          )}
          <button onClick={guardar}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-white shadow-md active:scale-95 transition-all
              ${cambios ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-200" : "bg-gray-800 hover:bg-gray-900"}`}>
            <Save size={17}/> Guardar
          </button>
        </div>
      </div>

      {/* BARRA DE AYUDA */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-5 py-2 flex items-center gap-8 text-[11px] text-gray-400 font-medium shrink-0">
        <span className="flex items-center gap-1.5"><Move size={12}/> Arrastrá la <b>zona</b> para moverla</span>
        <span>Los <b>handles blancos</b> en los bordes cambian el tamaño</span>
        <span><Lock size={11} className="inline mr-1"/>Bloqueá la zona para mover mesas sin moverla</span>
      </div>

      {/* CANVAS — todo el espacio restante, scroll propio ─────────────────── */}
      <div className="flex-1 overflow-hidden relative" onClick={() => setSeleccionada(null)}>
        <div className="absolute inset-0 overflow-auto">

          {/* Cuadrícula */}
          <div className="pointer-events-none absolute opacity-20"
            style={{
              width:"4000px", height:"4000px",
              backgroundImage:"linear-gradient(#9ca3af 1px,transparent 1px),linear-gradient(90deg,#9ca3af 1px,transparent 1px)",
              backgroundSize:"40px 40px",
            }}
          />

          <div className="relative w-[4000px] h-[4000px]">

            {/* ZONAS */}
            {sectores.map(s => {
              if (!zonas[s.nombre] || ocultas.has(s.nombre)) return null;
              return (
                <ZonaEditor
                  key={s.nombre} nombre={s.nombre}
                  rect={zonas[s.nombre]} color={colorDe(s.nombre)}
                  seleccionada={seleccionada === s.nombre}
                  bloqueada={bloqueadas.has(s.nombre)}
                  onSelect={() => setSeleccionada(s.nombre)}
                  onChange={r => handleZonaChange(s.nombre, r)}
                />
              );
            })}

            {/* MESAS */}
            {mesas.map(mesa => (
              <MesaDraggable
                key={mesa.id} mesa={mesa}
                onDragStop={handleMesaDrag}
                colorBorde={colorDe(mesa.sector ?? "General").borde}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}