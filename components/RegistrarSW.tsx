"use client";
import { useEffect } from "react";

export default function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/mozo" })
      .then((reg) => {
        // Verificar actualizaciones cada vez que el mozo abre la app
        reg.update();
      })
      .catch(() => {
        // Sin SW — la app sigue funcionando normal (sin offline)
      });
  }, []);

  return null;
}
