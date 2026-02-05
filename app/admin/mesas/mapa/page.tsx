"use client";
import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import toast from "react-hot-toast";
import { Save, ArrowLeft, LayoutGrid, Move, AlertCircle } from "lucide-react";
import Link from "next/link";

// 1. COMPONENTE INDIVIDUAL PARA CADA MESA
const MesaDraggable = ({ mesa, onDragStop }: any) => {
  const nodeRef = useRef(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: mesa.posX, y: mesa.posY }}
      onStop={(e, ui) => onDragStop(e, ui, mesa.id)}
      bounds="parent"
      grid={[20, 20]} // Se mueve de a 20px (tipo grilla)
    >
      <div 
        ref={nodeRef} 
        className="absolute cursor-grab active:cursor-grabbing group hover:z-50 w-24 h-24"
      >
        {/* Mesa Visual */}
        <div className="w-full h-full bg-white rounded-2xl shadow-lg border-2 border-gray-300 flex flex-col items-center justify-center group-hover:border-blue-500 group-hover:shadow-2xl transition-all relative select-none">
          
          {/* Sillas decorativas */}
          <div className="absolute -top-3 w-12 h-3 bg-gray-300 rounded-full"></div>
          <div className="absolute -bottom-3 w-12 h-3 bg-gray-300 rounded-full"></div>
          <div className="absolute -left-3 h-12 w-3 bg-gray-300 rounded-full"></div>
          <div className="absolute -right-3 h-12 w-3 bg-gray-300 rounded-full"></div>

          {/* Icono de mover que aparece al hacer hover */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
            <Move size={12} />
          </div>

          <span className="font-black text-gray-800 text-lg">{mesa.nombre}</span>
          <span className="text-[10px] text-gray-400 uppercase font-bold">{mesa.sector}</span>
        </div>
      </div>
    </Draggable>
  );
};

// 2. PÁGINA PRINCIPAL DEL EDITOR
export default function EditorMapaPage() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(false);

  // Cargar mesas
  useEffect(() => {
    fetch("/api/admin/mesas")
      .then((res) => res.json())
      .then((data) => {
        const mesasConPos = data.map((m: any) => ({
            ...m,
            posX: m.posX || 0,
            posY: m.posY || 0
        }));
        setMesas(mesasConPos);
        setCargando(false);
      });
  }, []);

  // Manejar el arrastre
  const handleDragStop = (e: any, ui: any, id: number) => {
    const nuevasMesas = mesas.map((m) => {
      if (m.id === id) {
        return { ...m, posX: ui.x, posY: ui.y };
      }
      return m;
    });
    setMesas(nuevasMesas);
    setCambiosSinGuardar(true);
  };

  // Guardar en BD
  const guardarMapa = async () => {
    const toastId = toast.loading("Guardando distribución...");
    const posiciones = mesas.map(m => ({ id: m.id, x: m.posX, y: m.posY }));

    try {
      await fetch("/api/admin/mesas/posiciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posiciones }),
      });
      toast.success("¡Mapa actualizado!", { id: toastId });
      setCambiosSinGuardar(false);
    } catch (e) {
      toast.error("Error al guardar", { id: toastId });
    }
  };

  if (cargando) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-100 text-gray-400 animate-pulse">
        Cargando salón...
    </div>
  );

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col overflow-hidden relative">
      
      {/* HEADER FIJO SUPERIOR (Diseño Compacto) */}
      <div className="bg-white px-6 py-3 border-b flex items-center shadow-sm z-40 shrink-0 gap-8">
        
        {/* 1. Volver y Título */}
        <div className="flex items-center gap-4">
            <Link href="/admin/mesas" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <ArrowLeft size={20} />
            </Link>
            <div>
                <h1 className="text-xl font-black flex items-center gap-2 text-gray-800 leading-none">
                    <LayoutGrid className="text-blue-600" size={22} />
                    Editor de Salón
                </h1>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Arrastrá las mesas</p>
            </div>
        </div>

        {/* Separador Vertical */}
        <div className="h-8 w-px bg-gray-200"></div>

        {/* 2. BOTÓN DE GUARDAR (Ahora pegado al título) */}
        <div className="flex items-center gap-4">
            <button 
                onClick={guardarMapa}
                className={`
                    flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-white shadow-md transition-all active:scale-95
                    ${cambiosSinGuardar 
                        ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-200" 
                        : "bg-gray-800 hover:bg-gray-900"
                    }
                `}
            >
                <Save size={18} />
                Guardar Cambios
            </button>

            {cambiosSinGuardar && (
                <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse border border-yellow-100">
                    <AlertCircle size={14} />
                    <span>Sin guardar</span>
                </div>
            )}
        </div>
      </div>

      {/* ÁREA DE TRABAJO (Scroll independiente) */}
      <div className="flex-1 relative bg-gray-200 overflow-auto cursor-grab active:cursor-grabbing">
        
        {/* Fondo cuadriculado infinito */}
        <div 
            className="absolute inset-0 opacity-20 pointer-events-none z-0" 
            style={{ 
                width: '3000px', height: '3000px', 
                backgroundImage: 'linear-gradient(#9ca3af 1px, transparent 1px), linear-gradient(90deg, #9ca3af 1px, transparent 1px)', 
                backgroundSize: '40px 40px' 
            }}
        ></div>

        {/* Contenedor de mesas */}
        <div className="relative w-[3000px] h-[3000px] p-20">
            {mesas.map((mesa) => (
                <MesaDraggable 
                    key={mesa.id} 
                    mesa={mesa} 
                    onDragStop={handleDragStop} 
                />
            ))}
        </div>
      </div>

    </div>
  );
}