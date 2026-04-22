"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ServicioListener({ localId }: { localId: number }) {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    console.log(`[RT] Conectando postgres_changes servicio local-${localId}...`);

    const canal = supabase
      .channel(`servicio-${localId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "Configuracion", filter: `localId=eq.${localId}` },
        () => {
          console.log("[RT] 📥 Configuracion UPDATE — refrescando");
          routerRef.current.refresh();
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`[RT] ✅ servicio local-${localId} activo`);
        }
        if (status === "CHANNEL_ERROR") {
          console.error("[RT] ❌ servicio error:", err);
        }
        if (status === "TIMED_OUT") {
          console.error("[RT] ⏰ servicio timeout");
        }
      });

    return () => { supabase.removeChannel(canal); };
  }, [localId]);

  return null;
}
