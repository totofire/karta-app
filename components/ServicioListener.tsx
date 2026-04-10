"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ServicioListener({ localId }: { localId: number }) {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    console.log(`[RT] Conectando broadcast servicio local-${localId}...`);

    const canal = supabase
      .channel(`local-${localId}-servicio`)
      .on("broadcast", { event: "config:update" }, () => {
        console.log("[RT] 📥 config:update — refrescando");
        routerRef.current.refresh();
      })
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
