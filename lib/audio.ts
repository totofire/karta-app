type SoundKey = 'ding' | 'caja';

const SOUNDS: Record<SoundKey, string> = {
  ding: '/sounds/ding.mp3',
  caja: '/sounds/caja.mp3',
};

const SESSION_KEY = 'karta_audio_unlocked';

class AudioManager {
  private _unlocked  = false;
  private _unlocking = false;
  private _listeners: Array<() => void> = [];
  private _queue: SoundKey[] = [];

  constructor() {
    // Restaurar desde sessionStorage si el usuario ya desbloqueó en esta sesión.
    // Esto sobrevive a router.refresh() y HMR en dev.
    if (typeof window !== 'undefined') {
      this._unlocked = sessionStorage.getItem(SESSION_KEY) === '1';

      // Cuando el tab vuelve al frente, reproducir los sonidos que llegaron
      // mientras estaba en background (el navegador bloquea audio en tabs ocultos).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this._queue.length > 0) {
          const pending = [...new Set(this._queue)]; // deduplicar
          this._queue = [];
          setTimeout(() => pending.forEach((k) => this._playNow(k)), 150);
        }
      });
    }
  }

  get unlocked() { return this._unlocked; }

  init() {} // no-op, mantenido por compatibilidad

  async tryUnlock(): Promise<boolean> {
    if (this._unlocked) return true;
    if (typeof window === 'undefined') return false;

    if (this._unlocking) {
      return new Promise<boolean>((resolve) => {
        const interval = setInterval(() => {
          if (!this._unlocking) {
            clearInterval(interval);
            resolve(this._unlocked);
          }
        }, 30);
      });
    }

    this._unlocking = true;
    try {
      const audio = new Audio(SOUNDS.ding);
      audio.volume = 0;
      await audio.play();
      audio.pause();
      audio.src = '';
      this._unlocked = true;
      sessionStorage.setItem(SESSION_KEY, '1'); // ← persistir
      this._listeners.forEach((fn) => fn());
      return true;
    } catch {
      return false;
    } finally {
      this._unlocking = false;
    }
  }

  play(key: SoundKey) {
    if (typeof window === 'undefined') return;

    // Si sessionStorage dice que estaba desbloqueado pero el flag en memoria
    // fue reseteado (router.refresh / HMR), lo restauramos antes de reproducir.
    if (!this._unlocked && sessionStorage.getItem(SESSION_KEY) === '1') {
      this._unlocked = true;
    }

    if (!this._unlocked) {
      console.warn(`[AudioManager] play("${key}") ignorado: audio no desbloqueado.`);
      return;
    }

    // Tab en background → encolar; se reproducirá cuando vuelva al frente.
    if (document.hidden) {
      this._queue.push(key);
      return;
    }

    this._playNow(key);
  }

  private _playNow(key: SoundKey) {
    try {
      const audio = new Audio(SOUNDS[key]);
      audio.volume = 1;
      audio.play().catch((err) => {
        console.warn('[AudioManager] play() falló:', err);
      });
    } catch (err) {
      console.warn('[AudioManager] Error creando Audio:', err);
    }
  }

  onUnlock(fn: () => void) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter((l) => l !== fn); };
  }
}

export const audioManager = new AudioManager();