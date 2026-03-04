/**
 * Singleton de audio compartido por todos los listeners.
 * Se desbloquea una sola vez ante cualquier interacción del usuario.
 */

type SoundKey = 'ding' | 'caja';

const SOUNDS: Record<SoundKey, string> = {
  ding:  '/sounds/ding.mp3',
  caja:  '/sounds/caja.mp3',
};

class AudioManager {
  private instances: Partial<Record<SoundKey, HTMLAudioElement>> = {};
  private _unlocked = false;
  private _listeners: Array<() => void> = [];

  /** Inicializa las instancias (llamar desde el cliente) */
  init() {
    if (typeof window === 'undefined' || Object.keys(this.instances).length) return;
    for (const [key, src] of Object.entries(SOUNDS)) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      this.instances[key as SoundKey] = audio;
    }
  }

  get unlocked() { return this._unlocked; }

  /** Intenta desbloquear reproduciendo silenciosamente. Devuelve true si lo logró. */
  async tryUnlock(): Promise<boolean> {
    if (this._unlocked) return true;
    this.init();
    const audio = this.instances.ding;
    if (!audio) return false;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      this._unlocked = true;
      this._listeners.forEach(fn => fn());
      return true;
    } catch {
      return false;
    }
  }

  /** Reproduce un sonido (solo si está desbloqueado) */
  play(key: SoundKey) {
    if (!this._unlocked) return;
    const audio = this.instances[key];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  /** Suscribirse al evento de desbloqueo */
  onUnlock(fn: () => void) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }
}

export const audioManager = new AudioManager();