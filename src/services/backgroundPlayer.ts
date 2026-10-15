// Background Playback and Screen-Lock Engine for FabTune
// Handles Media Session synchronization, Mobile OS audio keep-alive,
// Screen Wake Lock API, and visibility state transitions.

const STORAGE_KEY_BG_PLAY = 'fabtune_bg_play_enabled';
const STORAGE_KEY_WAKE_LOCK = 'fabtune_wake_lock_enabled';
const STORAGE_KEY_LOCK_CONTROLS = 'fabtune_lock_controls_enabled';

class BackgroundPlayerService {
  private isSupported: boolean = typeof window !== 'undefined';
  private bgPlayEnabled: boolean = true;
  private wakeLockEnabled: boolean = false;
  private lockControlsEnabled: boolean = true;
  private wakeLockSentinel: any = null;
  private silentAudioElement: HTMLAudioElement | null = null;
  private isRunning: boolean = false;
  private isTabHidden: boolean = false;
  private worker: Worker | null = null;
  private tickListeners: Set<() => void> = new Set();

  constructor() {
    if (!this.isSupported) return;

    // Load preferences
    const savedBg = localStorage.getItem(STORAGE_KEY_BG_PLAY);
    if (savedBg !== null) this.bgPlayEnabled = savedBg === 'true';

    const savedWake = localStorage.getItem(STORAGE_KEY_WAKE_LOCK);
    if (savedWake !== null) this.wakeLockEnabled = savedWake === 'true';

    const savedLock = localStorage.getItem(STORAGE_KEY_LOCK_CONTROLS);
    if (savedLock !== null) this.lockControlsEnabled = savedLock === 'true';

    this.initVisibilityListener();
    this.initWorkerClock();
  }

  // Generate an inaudible 2-second silent WAV data URL to keep Android & iOS audio sessions alive
  private getSilentWavUrl(): string {
    // 44-byte standard PCM WAV header + 8000 samples of 16-bit silence (0.5 sec loop)
    const sampleRate = 8000;
    const numSamples = sampleRate / 2; // 0.5s loop
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // RIFF header
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples * 2, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // "fmt " chunk
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    // "data" chunk
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, numSamples * 2, true);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private initWorkerClock() {
    if (typeof Worker === 'undefined') return;

    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(() => self.postMessage('tick'), 60);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this.tickListeners.forEach((cb) => {
            try {
              cb();
            } catch {}
          });
        }
      };
    } catch (err) {
      console.warn('Web Worker background clock unavailable, using timer fallback:', err);
    }
  }

  public subscribeTick(callback: () => void): () => void {
    this.tickListeners.add(callback);
    return () => this.tickListeners.delete(callback);
  }

  private initVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      this.isTabHidden = document.visibilityState === 'hidden';

      if (this.isTabHidden) {
        // App went to background (Home button pressed or screen turned off)
        if (this.isRunning && this.bgPlayEnabled) {
          this.ensureKeepAliveAudio();
        }
      } else {
        // App returned to foreground
        if (this.wakeLockEnabled && this.isRunning) {
          this.requestWakeLock();
        }
      }
    });
  }

  // Initializes or plays the HTML5 keep-alive audio element so mobile OS keeps background playback active
  public ensureKeepAliveAudio(): void {
    if (!this.bgPlayEnabled) return;

    try {
      if (!this.silentAudioElement) {
        this.silentAudioElement = new Audio();
        this.silentAudioElement.id = 'fabtune-bg-keepalive';
        this.silentAudioElement.loop = true;
        this.silentAudioElement.preload = 'auto';
        this.silentAudioElement.volume = 0.01; // Inaudible carrier
        this.silentAudioElement.src = this.getSilentWavUrl();
        this.silentAudioElement.setAttribute('playsinline', 'true');
        this.silentAudioElement.setAttribute('webkit-playsinline', 'true');
      }

      if (this.silentAudioElement.paused) {
        this.silentAudioElement.play().catch((err) => {
          // May be blocked if called outside user gesture; will play on next gesture
          console.debug('Keepalive audio play deferred:', err.message);
        });
      }
    } catch (err) {
      console.warn('Background keepalive audio init warning:', err);
    }
  }

  public pauseKeepAliveAudio(): void {
    if (this.silentAudioElement && !this.silentAudioElement.paused) {
      try {
        this.silentAudioElement.pause();
      } catch {}
    }
  }

  public onPlaybackStarted(): void {
    this.isRunning = true;
    this.ensureKeepAliveAudio();
    if (this.worker) {
      this.worker.postMessage('start');
    }
    if (this.wakeLockEnabled) {
      this.requestWakeLock();
    }
  }

  public onPlaybackPaused(): void {
    this.isRunning = false;
    this.pauseKeepAliveAudio();
    if (this.worker) {
      this.worker.postMessage('stop');
    }
    this.releaseWakeLock();
  }

  // Screen Wake Lock API
  public async requestWakeLock(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }
    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this.wakeLockSentinel.addEventListener('release', () => {
        this.wakeLockSentinel = null;
      });
      return true;
    } catch {
      return false;
    }
  }

  public releaseWakeLock(): void {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {}
      this.wakeLockSentinel = null;
    }
  }

  // Toggles and getters
  public setBackgroundPlayEnabled(enabled: boolean): void {
    this.bgPlayEnabled = enabled;
    localStorage.setItem(STORAGE_KEY_BG_PLAY, String(enabled));
    if (!enabled) {
      this.pauseKeepAliveAudio();
    } else if (this.isRunning) {
      this.ensureKeepAliveAudio();
    }
  }

  public getBackgroundPlayEnabled(): boolean {
    return this.bgPlayEnabled;
  }

  public setWakeLockEnabled(enabled: boolean): void {
    this.wakeLockEnabled = enabled;
    localStorage.setItem(STORAGE_KEY_WAKE_LOCK, String(enabled));
    if (enabled && this.isRunning) {
      this.requestWakeLock();
    } else {
      this.releaseWakeLock();
    }
  }

  public getWakeLockEnabled(): boolean {
    return this.wakeLockEnabled;
  }

  public setLockControlsEnabled(enabled: boolean): void {
    this.lockControlsEnabled = enabled;
    localStorage.setItem(STORAGE_KEY_LOCK_CONTROLS, String(enabled));
  }

  public getLockControlsEnabled(): boolean {
    return this.lockControlsEnabled;
  }

  public getIsTabHidden(): boolean {
    return this.isTabHidden;
  }
}

export const backgroundPlayerService = new BackgroundPlayerService();
