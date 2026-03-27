"use client";
import { useEffect } from "react";

export default function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        reg.update();
      })
      .catch(() => {
        // Sin SW — la app sigue funcionando normal (sin offline)
      });
  }, []);

  return null;
}
