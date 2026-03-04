'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify';
import { audioManager } from '@/lib/audio';

export default function CuentasListener() {
  const router = useRouter();
  const mesasSolicitadasRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    console.log('🟢 [CUENTAS] Iniciando listener...');

    const channel = supabase
      .channel('cuentas-standard-v1')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Sesion' }, async (payload) => {
        const pideCuenta = !payload.old.solicitaCuenta && payload.new.solicitaCuenta;
        if (!pideCuenta) return;

        const mesaId = payload.new.mesaId;
        if (mesasSolicitadasRef.current.has(mesaId)) return;
        mesasSolicitadasRef.current.add(mesaId);
        setTimeout(() => mesasSolicitadasRef.current.delete(mesaId), 10000);

        // Obtener nombre real de la mesa
        let nombreMesa = `Mesa #${mesaId}`;
        const { data } = await supabase.from('Mesa').select('nombre').eq('id', mesaId).single();
        if (data?.nombre) nombreMesa = data.nombre;

        audioManager.play('caja');
        navigator.vibrate?.([300, 100, 300]);
        notify.atencion('PIDEN LA CUENTA', nombreMesa);
        router.refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  return null;
}