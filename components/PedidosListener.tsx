'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify';
import { audioManager } from '@/lib/audio';

export default function PedidosListener() {
  const router = useRouter();

  useEffect(() => {
    console.log('🟢 [PEDIDOS] Iniciando conexión...');

    const channel = supabase
      .channel('pedidos-standard-v1')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Pedido' }, (payload) => {
        const pedido = payload.new || {};

        audioManager.play('ding');
        navigator.vibrate?.([200, 100, 200]);
        notify.pedido('¡NUEVO PEDIDO!', pedido.id || '???');
        router.refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  return null;
}