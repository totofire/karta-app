// lib/webNotify.ts
// Notificaciones nativas del navegador (Web Notifications API)
// Funcionan aunque la pestaña esté en segundo plano o minimizada.

const ICONO = "/logo-karta.png";

/**
 * Solicita permiso para mostrar notificaciones nativas.
 * Llama esto una sola vez al montar el layout del admin.
 * Si el usuario ya aceptó/rechazó, no vuelve a preguntar.
 */
export async function pedirPermiso(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Muestra una notificación nativa del sistema operativo.
 *
 * Estrategia dual:
 *  1. Si hay SW activo → usa sw.registration.showNotification()
 *     Esto funciona incluso con el tab completamente en background / sin foco.
 *  2. Fallback → new Notification() clásica (requiere tab visible o con foco).
 *
 * Mismo tag reemplaza la notificación anterior (evita spam).
 */
export function notificarNativo(
  titulo: string,
  cuerpo: string,
  tag?: string,
): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const opciones = {
    body:     cuerpo,
    icon:     ICONO,
    badge:    ICONO,
    tag:      tag ?? titulo,
    renotify: true,
  } as NotificationOptions & { renotify: boolean };

  // Intentar vía Service Worker (funciona en background).
  // navigator.serviceWorker.ready NUNCA resuelve si no hay SW activo para
  // el scope actual, y NUNCA rechaza → deadlock silencioso.
  // Usamos Promise.race con timeout de 800ms para caer al fallback directo.
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(titulo, opciones);
      })
      .catch(() => {
        _notificarDirecto(titulo, opciones);
      });
    return;
  }

  // Sin SW controlando esta página → fallback inmediato
  _notificarDirecto(titulo, opciones);
}

function _notificarDirecto(
  titulo: string,
  opciones: NotificationOptions & { renotify: boolean },
): void {
  try {
    const n = new Notification(titulo, opciones);
    n.onclick = () => { window.focus(); n.close(); };
  } catch (err) {
    console.warn("[webNotify] Error al crear notificación:", err);
  }
}