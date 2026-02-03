"use client";
import { useEffect, useRef } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { BellRing, GlassWater } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotificationListener() {
  // Vigilamos ambas colas al mismo tiempo
  const { data: cocina = [] } = useSWR("/api/cocina", fetcher, { refreshInterval: 5000 });
  const { data: barra = [] } = useSWR("/api/barra", fetcher, { refreshInterval: 5000 });

  const cocinaRef = useRef<number[]>([]);
  const barraRef = useRef<number[]>([]);
  const primeraCarga = useRef(true);

  useEffect(() => {
    // Evitamos notificar apenas cargamos la página (sería molesto)
    if (primeraCarga.current) {
        if (cocina.length > 0) cocinaRef.current = cocina.map((p:any) => p.id);
        if (barra.length > 0) barraRef.current = barra.map((p:any) => p.id);
        primeraCarga.current = false;
        return;
    }

    // 1. DETECTAR NUEVOS EN COCINA 🍔
    const nuevosCocina = cocina.filter((p:any) => !cocinaRef.current.includes(p.id));
    if (nuevosCocina.length > 0) {
        playDing();
        nuevosCocina.forEach((p:any) => mostrarAlerta("cocina", p));
        cocinaRef.current = cocina.map((p:any) => p.id);
    }

    // 2. DETECTAR NUEVOS EN BARRA 🍹
    const nuevosBarra = barra.filter((p:any) => !barraRef.current.includes(p.id));
    if (nuevosBarra.length > 0) {
        playDing();
        nuevosBarra.forEach((p:any) => mostrarAlerta("barra", p));
        barraRef.current = barra.map((p:any) => p.id);
    }

  }, [cocina, barra]);

  const playDing = () => {
    const audio = new Audio("/sounds/ding.mp3");
    audio.play().catch(e => console.log("Interacción requerida para audio"));
  };

  const mostrarAlerta = (tipo: "cocina" | "barra", p: any) => {
    const esCocina = tipo === "cocina";
    
    toast.custom((t) => (
      <div 
        onClick={() => {
            // Al hacer click te lleva a la sección correspondiente
            window.location.href = esCocina ? "/admin/cocina" : "/admin/barra";
            toast.dismiss(t.id);
        }}
        className={`${t.visible ? 'animate-in slide-in-from-top-2 fade-in' : 'animate-out slide-out-to-top-2 fade-out'} 
        max-w-md w-full bg-white shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 
        cursor-pointer hover:bg-gray-50 transition-colors border-l-8 ${esCocina ? 'border-red-600' : 'border-blue-600'}`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${esCocina ? 'bg-red-100' : 'bg-blue-100'}`}>
                {esCocina ? (
                    <BellRing className="h-6 w-6 text-red-600 animate-bounce" />
                ) : (
                    <GlassWater className="h-6 w-6 text-blue-600 animate-bounce" />
                )}
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-lg font-black text-gray-900">
                {esCocina ? "¡NUEVA COMANDA!" : "¡BEBIDAS NUEVAS!"}
              </p>
              <p className="mt-1 text-sm text-gray-500 font-bold">
                Mesa {p.sesion.mesa.nombre}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {p.items.length} items • {p.nombreCliente || "Cliente"}
              </p>
            </div>
          </div>
        </div>
      </div>
    ), { duration: 8000, position: 'top-right' });
  };

  return null; // Este componente no renderiza nada visualmente en el DOM
}