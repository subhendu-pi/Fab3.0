import { Song } from '../types/music';

interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
}

class MediaSessionManager {
  private isSupported: boolean = false;
  private currentSongId: string | null = null;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'mediaSession' in navigator;
  }

  public init(callbacks: MediaSessionCallbacks) {
    if (!this.isSupported) return;

    try {
      const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
        ['play', () => callbacks.onPlay()],
        ['pause', () => callbacks.onPause()],
        ['previoustrack', () => callbacks.onPrevious()],
        ['nexttrack', () => callbacks.onNext()],
        [
          'seekto',
          (details) => {
            if (details.seekTime !== undefined) {
              callbacks.onSeek(details.seekTime);
            }
          },
        ],
        [
          'seekbackward',
          (details) => {
            const skip = details.seekOffset || 10;
            // Seek handled via seekto or relative offset
          },
        ],
        [
          'seekforward',
          (details) => {
            const skip = details.seekOffset || 10;
          },
        ],
      ];

      for (const [action, handler] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch {
          // Action might not be supported on this browser
        }
      }
    } catch (e) {
      console.warn('Failed to register mediaSession action handlers:', e);
    }
  }

  public updateMetadata(song: Song) {
    if (!this.isSupported) return;

    try {
      const artworkSrc = song.coverUrl || '/pwa-512x512.png';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'FabTune',
        artwork: [
          { src: artworkSrc, sizes: '96x96', type: 'image/png' },
          { src: artworkSrc, sizes: '128x128', type: 'image/png' },
          { src: artworkSrc, sizes: '192x192', type: 'image/png' },
          { src: artworkSrc, sizes: '256x256', type: 'image/png' },
          { src: artworkSrc, sizes: '384x384', type: 'image/png' },
          { src: artworkSrc, sizes: '512x512', type: 'image/png' },
        ],
      });

      this.currentSongId = song.id;
    } catch (e) {
      console.warn('Failed to update MediaMetadata:', e);
    }
  }

  public updatePlaybackState(isPlaying: boolean) {
    if (!this.isSupported) return;

    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {
      // Ignored
    }
  }

  public updatePositionState(duration: number, currentTime: number, playbackRate = 1.0) {
    if (!this.isSupported || typeof navigator.mediaSession.setPositionState !== 'function') return;

    try {
      if (duration > 0 && currentTime >= 0 && currentTime <= duration) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: Math.max(0.1, playbackRate),
          position: Math.min(currentTime, duration),
        });
      }
    } catch {
      // Ignored on edge cases where currentTime exceeds duration momentarily
    }
  }
}

export const mediaSessionManager = new MediaSessionManager();
