"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { BellRing, GlassWater } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotificationListener() {
  // 🚀 CLAVE 1: refreshWhenHidden: true
  // Esto obliga al navegador a seguir buscando pedidos aunque estés en WhatsApp
  const { data: cocina, isLoading: cargandoCocina } = useSWR(
    "/api/cocina",
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      refreshWhenHidden: true,
    },
  );

  const { data: barra, isLoading: cargandoBarra } = useSWR(
    "/api/barra",
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      refreshWhenHidden: true,
    },
  );

  const cocinaIds = useRef<Set<number>>(new Set());
  const barraIds = useRef<Set<number>>(new Set());
  const [listo, setListo] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pedimos permiso para notificaciones del sistema al cargar
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
    // Pre-cargamos el audio
    audioRef.current = new Audio("/sounds/ding.mp3");
  }, []);

  useEffect(() => {
    // 1. INICIALIZACIÓN SILENCIOSA
    if (!listo && !cargandoCocina && !cargandoBarra && cocina && barra) {
      cocina.forEach((p: any) => cocinaIds.current.add(p.id));
      barra.forEach((p: any) => barraIds.current.add(p.id));
      setListo(true);
      return;
    }

    // 2. MONITOREO
    if (listo) {
      // --- COCINA ---
      if (cocina) {
        const nuevos = cocina.filter((p: any) => !cocinaIds.current.has(p.id));
        if (nuevos.length > 0) {
          reproducirAlerta();
          nuevos.forEach((p: any) => {
            notificar("cocina", p);
            cocinaIds.current.add(p.id);
          });
        }
      }

      // --- BARRA ---
      if (barra) {
        const nuevos = barra.filter((p: any) => !barraIds.current.has(p.id));
        if (nuevos.length > 0) {
          reproducirAlerta();
          nuevos.forEach((p: any) => {
            notificar("barra", p);
            barraIds.current.add(p.id);
          });
        }
      }
    }
  }, [cocina, barra, cargandoCocina, cargandoBarra, listo]);

  const reproducirAlerta = () => {
    // Intentamos reproducir sonido
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reiniciar si ya estaba sonando
      audioRef.current.volume = 1.0; // Volumen al máximo
      audioRef.current.play().catch((e) => {
        console.warn(
          "El navegador bloqueó el audio automático. Hacé click en la página una vez.",
        );
      });
    }
  };

  const notificar = (tipo: "cocina" | "barra", p: any) => {
    const esCocina = tipo === "cocina";
    const titulo = esCocina ? "¡NUEVA COMANDA! 🍔" : "¡BEBIDAS NUEVAS! 🍹";
    const texto = `Mesa ${p.sesion.mesa.nombre} • ${p.items.length} items`;

    // A. Notificación Visual en la App (Toast)
    mostrarToast(esCocina, titulo, texto, p);

    // B. Notificación del Sistema (Windows/Android)
    // Esto es lo que te salva si estás en WhatsApp
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      document.hidden
    ) {
      if (Notification.permission === "granted") {
        const notif = new Notification("KARTA: " + titulo, {
          body: texto,
          icon: "/logo-karta.png", // Asegurate que esta imagen exista
          tag: "nuevo-pedido", // Evita spam masivo, agrupa
        });
        notif.onclick = () => {
          window.focus(); // Intenta traer la ventana al frente
          window.location.href = esCocina ? "/admin/cocina" : "/admin/barra";
        };
      }
    }
  };

  const mostrarToast = (
    esCocina: boolean,
    titulo: string,
    texto: string,
    p: any,
  ) => {
    toast.custom(
      (t) => (
        <div
          onClick={() => {
            window.location.href = esCocina ? "/admin/cocina" : "/admin/barra";
            toast.dismiss(t.id);
          }}
          className={`${t.visible ? "animate-in slide-in-from-top-5 fade-in" : "animate-out fade-out"} 
        max-w-sm w-full bg-white shadow-xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 
        cursor-pointer hover:scale-[1.02] transition-transform duration-200 overflow-hidden border-l-4 ${esCocina ? "border-red-500" : "border-blue-500"}`}
        >
          <div className="flex-1 p-4 flex items-center gap-4">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${esCocina ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
            >
              {esCocina ? <BellRing size={24} /> : <GlassWater size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">
                {titulo}
              </p>
              <p className="text-sm text-gray-600 truncate">{texto}</p>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">
                CLICK PARA VER
              </p>
            </div>
          </div>
        </div>
      ),
      { duration: 5000, position: "top-right" },
    );
  };

  return null;
}
