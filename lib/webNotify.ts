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
 * Si el permiso no fue otorgado, no hace nada (falla silenciosamente).
 * Al hacer click en la notificación, enfoca la pestaña de Karta.
 */
export function notificarNativo(
  titulo: string,
  cuerpo: string,
  tag?: string, // mismo tag = reemplaza notificación anterior (evita spam)
): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const n = new Notification(titulo, {
  body:     cuerpo,
  icon:     ICONO,
  badge:    ICONO,
  tag:      tag ?? titulo,
  renotify: true,
} as NotificationOptions & { renotify: boolean });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (err) {
    // Algunos navegadores en modo privado pueden lanzar error
    console.warn("[webNotify] Error al crear notificación:", err);
  }
}