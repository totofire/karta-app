"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ServicioListener({ localId }: { localId: number }) {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    const canal = supabase
      .channel(`servicio-${localId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Configuracion",
          filter: `localId=eq.${localId}`,
        },
        () => {
          routerRef.current.refresh();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [localId]);

  return null;
}
