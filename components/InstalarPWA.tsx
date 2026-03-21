"use client";
import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstalarPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [esIOS, setEsIOS] = useState(false);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    // Ya instalada como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalada(true);
      return;
    }

    // Detectar iOS (Safari no soporta beforeinstallprompt)
    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window as any).MSStream;

    if (isIOS) {
      // Mostrar instrucciones manuales solo si no fue descartado antes
      const descartado = sessionStorage.getItem("pwa-descartado");
      if (!descartado) {
        setEsIOS(true);
        setVisible(true);
      }
      return;
    }

    // Android / Chrome — escuchar evento de instalación
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      const descartado = sessionStorage.getItem("pwa-descartado");
      if (!descartado) setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalada(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const instalar = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setVisible(false);
    setPrompt(null);
  };

  const descartar = () => {
    sessionStorage.setItem("pwa-descartado", "1");
    setVisible(false);
  };

  if (!visible || instalada) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-lg mx-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-red-600 p-2.5 rounded-xl flex-shrink-0">
              <Smartphone size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-tight">
                Instalá Karta en tu celular
              </p>
              {esIOS ? (
                <p className="text-slate-400 text-xs font-medium mt-1 leading-relaxed">
                  Tocá <span className="text-white font-black">Compartir</span>{" "}
                  (
                  <svg
                    className="inline w-3 h-3 mb-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  ) y luego{" "}
                  <span className="text-white font-black">
                    &quot;Añadir a pantalla de inicio&quot;
                  </span>
                </p>
              ) : (
                <p className="text-slate-400 text-xs font-medium mt-1">
                  Acceso rápido desde la pantalla de inicio, sin browser.
                </p>
              )}
            </div>
            <button
              onClick={descartar}
              className="text-slate-500 hover:text-slate-300 p-1 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {!esIOS && (
            <button
              onClick={instalar}
              className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Download size={16} />
              Instalar ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
