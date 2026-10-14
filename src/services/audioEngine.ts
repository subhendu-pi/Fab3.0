import { EQBandConfig, EQPreset, Song } from '../types/music';

export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_LABELS = ['60Hz', '170Hz', '310Hz', '600Hz', '1kHz', '3kHz', '6kHz', '12kHz', '14kHz', '16kHz'];

export const EQ_PRESETS: EQPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', gains: [7, 6, 4, 2, 0, 0, 1, 2, 3, 3] },
  { name: 'Lo-Fi Warmth', gains: [4, 5, 3, 1, -1, -2, -2, -4, -6, -8] },
  { name: 'Vocal Booster', gains: [-2, -1, 1, 3, 5, 4, 3, 1, 0, -1] },
  { name: 'Electronic', gains: [6, 5, 2, 0, -1, 2, 3, 4, 5, 6] },
  { name: 'Rock / Dynamic', gains: [5, 4, -1, -2, 0, 2, 4, 5, 4, 3] },
  { name: 'Acoustic / Live', gains: [3, 2, 1, 2, 3, 3, 3, 4, 3, 2] },
  { name: 'Treble Crisp', gains: [-3, -2, -1, 0, 1, 3, 5, 7, 8, 9] },
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  // Synthesizer runtime state
  private synthInterval: number | null = null;
  private visualizerPulseInterval: number | null = null;
  private currentSong: Song | null = null;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private playbackRate: number = 1.0;
  private volume: number = 0.85;
  private isMuted: boolean = false;
  private onTimeUpdateCallback: ((time: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;

  // YouTube Player iframe integration
  private ytPlayer: any = null;
  private isYtReady: boolean = false;
  private isYtLoading: boolean = false;
  private pendingVideoId: string | null = null;
  private ytPollInterval: number | null = null;

  constructor() {
    this.ensureYouTubeIframeApi();
  }

  private ensureYouTubeIframeApi() {
    if (typeof window === 'undefined') return;
    if ((window as any).YT && (window as any).YT.Player) {
      this.isYtReady = true;
      return;
    }

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);

      (window as any).onYouTubeIframeAPIReady = () => {
        this.isYtReady = true;
        this.initYtPlayer();
      };
    }
  }

  private initYtPlayer() {
    if (typeof document === 'undefined' || this.ytPlayer) return;

    let container = document.getElementById('yt-audio-player-frame');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-audio-player-frame';
      container.style.position = 'fixed';
      container.style.bottom = '-9999px';
      container.style.right = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }

    try {
      this.ytPlayer = new (window as any).YT.Player('yt-audio-player-frame', {
        height: '1',
        width: '1',
        videoId: this.pendingVideoId || 'dQw4w9WgXcQ',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            this.isYtReady = true;
            event.target.setVolume(this.isMuted ? 0 : this.volume * 100);
            if (this.pendingVideoId) {
              event.target.loadVideoById(this.pendingVideoId, this.currentTime);
              this.pendingVideoId = null;
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            if (event.data === 1) {
              this.isPlaying = true;
              this.startYtPolling();
              this.startVisualizerPulse();
            } else if (event.data === 2) {
              this.isPlaying = false;
              this.stopYtPolling();
              this.stopVisualizerPulse();
            } else if (event.data === 0) {
              this.isPlaying = false;
              this.stopYtPolling();
              this.stopVisualizerPulse();
              this.onEndedCallback?.();
            }
          },
          onError: (err: any) => {
            console.warn('YouTube Player error, falling back to synth audio:', err);
            this.stopYtPolling();
            this.startSynth();
          },
        },
      });
    } catch (e) {
      console.warn('Failed to construct YT.Player:', e);
    }
  }

  private startYtPolling() {
    this.stopYtPolling();
    this.ytPollInterval = window.setInterval(() => {
      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const time = this.ytPlayer.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          this.currentTime = time;
          this.onTimeUpdateCallback?.(this.currentTime);
        }
      }
    }, 150);
  }

  private stopYtPolling() {
    if (this.ytPollInterval) {
      clearInterval(this.ytPollInterval);
      this.ytPollInterval = null;
    }
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Build 10-band Equalizer chain
      this.filters = EQ_FREQUENCIES.map((freq, index) => {
        const filter = this.ctx!.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Chain filters: filter[0] -> filter[1] -> ... -> masterGain -> analyser -> destination
      for (let i = 0; i < this.filters.length - 1; i++) {
        this.filters[i].connect(this.filters[i + 1]);
      }

      this.filters[this.filters.length - 1].connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Setup audio element for URLs / files
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.addEventListener('timeupdate', () => {
        if (this.currentSong?.audioType === 'local' && this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
          this.onTimeUpdateCallback?.(this.currentTime);
        }
      });
      this.audioElement.addEventListener('ended', () => {
        this.onEndedCallback?.();
      });

      try {
        this.mediaSource = this.ctx.createMediaElementSource(this.audioElement);
        this.mediaSource.connect(this.filters[0]);
      } catch (e) {
        console.warn('Media element source already connected or failed:', e);
      }
    } catch (err) {
      console.warn('AudioContext init error:', err);
    }
  }

  public setCallbacks(onTimeUpdate: (t: number) => void, onEnded: () => void) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onEndedCallback = onEnded;
  }

  public async loadAndPlay(song: Song, startTime = 0) {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.stopSynth();
    this.stopYtPolling();
    this.currentSong = song;
    this.currentTime = startTime;

    // Check if song has YouTube Video ID
    if (song.videoId) {
      if (this.audioElement) {
        this.audioElement.pause();
      }

      if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
        try {
          this.ytPlayer.loadVideoById(song.videoId, startTime);
          this.ytPlayer.setVolume(this.isMuted ? 0 : this.volume * 100);
          this.ytPlayer.setPlaybackRate(this.playbackRate);
          this.isPlaying = true;
          this.startYtPolling();
          this.startVisualizerPulse();
          return;
        } catch (e) {
          console.warn('YouTube loadVideoById error, falling back:', e);
        }
      } else {
        this.pendingVideoId = song.videoId;
        this.initYtPlayer();
        this.startVisualizerPulse();
        return;
      }
    }

    if (song.audioType === 'local' && song.audioUrl) {
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try {
          this.ytPlayer.pauseVideo();
        } catch {}
      }

      if (this.audioElement) {
        this.audioElement.src = song.audioUrl;
        this.audioElement.currentTime = startTime;
        this.audioElement.playbackRate = this.playbackRate;
        try {
          await this.audioElement.play();
          this.isPlaying = true;
          return;
        } catch (e) {
          console.warn('Playback error, falling back to synth audio:', e);
        }
      }
    }

    // Default: Procedural Synth
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch {}
    }
    this.startSynth();
  }

  public async play() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.currentSong?.videoId && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      this.ytPlayer.playVideo();
      this.isPlaying = true;
      this.startYtPolling();
      this.startVisualizerPulse();
      return;
    }

    if (this.currentSong?.audioType === 'local' && this.audioElement && this.audioElement.src) {
      await this.audioElement.play();
      this.isPlaying = true;
      return;
    }

    this.startSynth();
  }

  public pause() {
    this.isPlaying = false;
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch {}
    }
    this.stopYtPolling();
    this.stopVisualizerPulse();

    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopSynth();
  }

  public seek(seconds: number) {
    this.currentTime = Math.max(0, Math.min(seconds, this.currentSong?.duration || 300));

    if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function' && this.currentSong?.videoId) {
      try {
        this.ytPlayer.seekTo(this.currentTime, true);
      } catch {}
    }

    if (this.audioElement && this.currentSong?.audioType === 'local') {
      this.audioElement.currentTime = this.currentTime;
    }

    this.onTimeUpdateCallback?.(this.currentTime);
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }

    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
    }

    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try {
        this.ytPlayer.setVolume(this.isMuted ? 0 : this.volume * 100);
      } catch {}
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.setVolume(this.volume);
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;

    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }

    if (this.ytPlayer && typeof this.ytPlayer.setPlaybackRate === 'function') {
      try {
        this.ytPlayer.setPlaybackRate(rate);
      } catch {}
    }
  }

  public setEQBandGain(bandIndex: number, gainDb: number) {
    if (this.filters[bandIndex] && this.ctx) {
      this.filters[bandIndex].gain.setValueAtTime(gainDb, this.ctx.currentTime);
    }
  }

  public setEQPreset(preset: EQPreset) {
    preset.gains.forEach((g, idx) => {
      this.setEQBandGain(idx, g);
    });
  }

  // Visualizer data feeder for Canvas visualizer and vinyl turntable reactivity
  private startVisualizerPulse() {
    this.stopVisualizerPulse();
    if (!this.ctx) return;

    // Gentle sub-bass pulse into analyser so visualizer reflects active stream
    this.visualizerPulseInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || this.filters.length === 0) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(70 + Math.random() * 40, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.005, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.filters[0]);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.15);
    }, 220);
  }

  private stopVisualizerPulse() {
    if (this.visualizerPulseInterval) {
      clearInterval(this.visualizerPulseInterval);
      this.visualizerPulseInterval = null;
    }
  }

  public getVisualizerData(): { frequency: Uint8Array; waveform: Uint8Array } {
    const defaultData = {
      frequency: new Uint8Array(128).fill(this.isPlaying ? 45 : 0),
      waveform: new Uint8Array(128).fill(128),
    };

    if (!this.analyser) return defaultData;

    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    const waveData = new Uint8Array(this.analyser.frequencyBinCount);

    this.analyser.getByteFrequencyData(freqData);
    this.analyser.getByteTimeDomainData(waveData);

    return {
      frequency: freqData,
      waveform: waveData,
    };
  }

  // Realistic Procedural Web Audio Synth generator
  private startSynth() {
    this.isPlaying = true;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
    }

    const intervalMs = 100;
    let step = Math.floor(this.currentTime * 4);

    this.synthInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.currentSong) return;

      this.currentTime += (intervalMs / 1000) * this.playbackRate;
      this.onTimeUpdateCallback?.(this.currentTime);

      if (this.currentTime >= this.currentSong.duration) {
        this.pause();
        this.currentTime = 0;
        this.onEndedCallback?.();
        return;
      }

      // Schedule notes on 16th beats
      const currentBeatStep = Math.floor(this.currentTime * (this.currentSong.bpm ? this.currentSong.bpm / 15 : 6));
      if (currentBeatStep !== step) {
        step = currentBeatStep;
        this.playProceduralVoice(step, this.currentSong);
      }
    }, intervalMs);
  }

  private stopSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  private playProceduralVoice(step: number, song: Song) {
    if (!this.ctx || this.filters.length === 0) return;
    const now = this.ctx.currentTime;
    const targetInput = this.filters[0];

    const scales: Record<string, number[]> = {
      'Lo-Fi / Chill': [220, 261.63, 293.66, 329.63, 392.0, 440, 523.25],
      'Synthwave': [196, 220, 246.94, 293.66, 329.63, 392, 440],
      'Acoustic': [196, 246.94, 293.66, 329.63, 392, 440, 493.88],
      'Ambient': [130.81, 164.81, 196, 246.94, 261.63, 329.63],
      'Pop': [261.63, 293.66, 329.63, 392, 440, 523.25],
    };

    const scale = scales[song.genre] || scales['Lo-Fi / Chill'];
    const chordRoot = scale[Math.floor(step / 16) % scale.length];

    // Kick/Bass Pulse
    if (step % 8 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = song.genre === 'Synthwave' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(chordRoot * 0.5, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(targetInput);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    // Chords / Pad Atmosphere
    if (step % 8 === 2) {
      const notes = [chordRoot, chordRoot * 1.25, chordRoot * 1.5];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = song.genre === 'Acoustic' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq * (idx === 0 ? 1 : 1.5), now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.045, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(targetInput);
        osc.start(now);
        osc.stop(now + 1.3);
      });
    }

    // Lead Melody Note
    if (step % 4 === 1 || step % 7 === 0) {
      const noteFreq = scale[(step * 3) % scale.length] * 2;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.038, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(targetInput);
      osc.start(now);
      osc.stop(now + 0.5);
    }

    // Snare / Vinyl Crackle
    if (step % 8 === 4) {
      const bufferSize = this.ctx.sampleRate * 0.06;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(targetInput);
      whiteNoise.start(now);
    }
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioEngine = new AudioEngine();
