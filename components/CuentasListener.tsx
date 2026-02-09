'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify';

export default function CuentasListener() {
  const router = useRouter();
  const audioCaja = useRef<HTMLAudioElement | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const mesasSolicitadasRef = useRef<Set<number>>(new Set());

  // 1. CONFIGURACIÓN DE AUDIO
  useEffect(() => {
    if (typeof window === 'undefined') return;

    audioCaja.current = new Audio('/sounds/caja.mp3');
    audioCaja.current.preload = 'auto';

    const unlock = () => {
       if(audioCaja.current && !audioEnabled) {
          audioCaja.current.play().then(() => {
             audioCaja.current?.pause();
             audioCaja.current!.currentTime = 0;
             setAudioEnabled(true);
          }).catch(()=>{});
       }
    };

    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });

    return () => {
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
    };
  }, [audioEnabled]);

  // 2. LISTENER DE SUPABASE
  useEffect(() => {
    console.log('🟢 [CUENTAS] Iniciando listener...');

    const channel = supabase
      .channel('cuentas-standard-v1')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Sesion' },
        async (payload) => {
          const pideCuenta = !payload.old.solicitaCuenta && payload.new.solicitaCuenta;

          if (pideCuenta) {
            const mesaId = payload.new.mesaId;

            // Evitar duplicados
            if (mesasSolicitadasRef.current.has(mesaId)) return;
            mesasSolicitadasRef.current.add(mesaId);
            setTimeout(() => mesasSolicitadasRef.current.delete(mesaId), 10000);

            // 🔥 PASO NUEVO: Obtener el nombre de la mesa
            let nombreMesa = `Mesa #${mesaId}`; // Valor por defecto
            
            // Hacemos una consulta rápida para buscar el nombre real
            const { data: datosMesa } = await supabase
                .from('Mesa')
                .select('nombre')
                .eq('id', mesaId)
                .single();

            if (datosMesa && datosMesa.nombre) {
                nombreMesa = datosMesa.nombre;
            }

            // 1. Reproducir Sonido
            if (audioCaja.current) {
                audioCaja.current.currentTime = 0;
                audioCaja.current.play().catch(console.error);
            }

            // 2. Notificación Visual (Ahora con el nombre real)
            notify.atencion("PIDEN LA CUENTA", nombreMesa);

            // 3. Actualizar la vista del Admin
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}