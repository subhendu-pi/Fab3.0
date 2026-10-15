import React, { useState, useEffect, useRef } from 'react';
import {
  ActiveTab,
  ColorTheme,
  PlaybackRepeat,
  Playlist,
  Song,
  ThemeBrightness,
  UserListeningStats,
} from './types/music';
import { INITIAL_PLAYLISTS, INITIAL_SONGS } from './data/musicData';
import { audioEngine } from './services/audioEngine';
import { HomeView } from './components/views/HomeView';
import { ExploreView } from './components/views/ExploreView';
import { LibraryView } from './components/views/LibraryView';
import { SearchView } from './components/views/SearchView';
import { MiniPlayer } from './components/player/MiniPlayer';
import { FullPlayerModal } from './components/player/FullPlayerModal';
import { PlaylistDetailModal } from './components/views/PlaylistDetailModal';
import { WrappedModal } from './components/wrapped/WrappedModal';
import { SettingsModal } from './components/views/SettingsModal';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { AndroidApkModal } from './components/pwa/AndroidApkModal';
import { mediaSessionManager } from './services/mediaSession';
import {
  Disc,
  Compass,
  Library,
  Search,
  Sparkles,
  Settings,
  Sliders,
  Smartphone,
} from 'lucide-react';

const STORAGE_KEY_LIKES = 'fabtune_liked_ids';
const STORAGE_KEY_PLAYLISTS = 'fabtune_playlists';
const STORAGE_KEY_THEME = 'fabtune_theme';
const STORAGE_KEY_BRIGHTNESS = 'fabtune_brightness';
const STORAGE_KEY_STATS = 'fabtune_stats';
const STORAGE_KEY_REPEAT = 'fabtune_repeat';
const STORAGE_KEY_SHUFFLE = 'fabtune_shuffle';
const STORAGE_KEY_INFINITY = 'fabtune_infinity';
const STORAGE_KEY_AUTO_RECOMMEND = 'fabtune_auto_recommend';

const ACCENT_COLORS: Record<ColorTheme, string> = {
  'monet-teal': '#14b8a6',
  'monet-purple': '#818cf8',
  'sunset-amber': '#f59e0b',
  'cyber-blue': '#06b6d4',
  'forest-emerald': '#10b981',
  'rose-quartz': '#f43f5e',
};

export default function App() {
  // Songs & Playlists
  const [songs, setSongs] = useState<Song[]>(INITIAL_SONGS);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
      return saved ? JSON.parse(saved) : INITIAL_PLAYLISTS;
    } catch {
      return INITIAL_PLAYLISTS;
    }
  });

  const [likedSongIds, setLikedSongIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LIKES);
      return saved ? JSON.parse(saved) : ['track-1', 'track-2'];
    } catch {
      return ['track-1', 'track-2'];
    }
  });

  // Current Playing State
  const [currentSong, setCurrentSong] = useState<Song>(INITIAL_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(INITIAL_SONGS[0].duration);
  const [queue, setQueue] = useState<Song[]>(INITIAL_SONGS);
  const [repeatMode, setRepeatMode] = useState<PlaybackRepeat>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REPEAT);
    return (saved as PlaybackRepeat) || 'all';
  });
  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_SHUFFLE) === 'true';
  });
  const [isInfinity, setIsInfinity] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_INFINITY);
    return saved !== null ? saved === 'true' : true;
  });
  const [isAutoRecommend, setIsAutoRecommend] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUTO_RECOMMEND);
    return saved !== null ? saved === 'true' : true; // Default: automatically operate
  });
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Views & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showFullPlayer, setShowFullPlayer] = useState<boolean>(false);
  const [showWrapped, setShowWrapped] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAndroidApkModal, setShowAndroidApkModal] = useState<boolean>(false);

  // Appearance & Themes
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    return (localStorage.getItem(STORAGE_KEY_THEME) as ColorTheme) || 'monet-teal';
  });

  const [themeBrightness, setThemeBrightness] = useState<ThemeBrightness>(() => {
    return (localStorage.getItem(STORAGE_KEY_BRIGHTNESS) as ThemeBrightness) || 'dark';
  });

  // Sleep Timer
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const sleepTimerRef = useRef<number | null>(null);

  // Listening Stats for Wrapped
  const [stats, setStats] = useState<UserListeningStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATS);
      return saved
        ? JSON.parse(saved)
        : {
            totalMinutes: 4820,
            topSongId: 'track-1',
            topArtist: 'Celestial Beats',
            topGenre: 'Lo-Fi / Chill',
            playedTrackCounts: {
              'track-1': 142,
              'track-2': 118,
              'track-3': 75,
              'track-5': 62,
              'track-7': 54,
            },
            personaTitle: 'The Celestial Night Owl',
            personaDescription:
              'You thrive in the midnight frequencies. You immerse yourself in contemplative lo-fi rhythms, nocturnal synth waves, and reflective melodies when the rest of the world is asleep.',
          };
    } catch {
      return {
        totalMinutes: 4820,
        topSongId: 'track-1',
        topArtist: 'Celestial Beats',
        topGenre: 'Lo-Fi / Chill',
        playedTrackCounts: {},
        personaTitle: 'The Celestial Night Owl',
        personaDescription: 'You thrive in the midnight frequencies.',
      };
    }
  });

  // Persist State
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(likedSongIds));
  }, [likedSongIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BRIGHTNESS, themeBrightness);
  }, [themeBrightness]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPEAT, repeatMode);
  }, [repeatMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SHUFFLE, String(isShuffle));
  }, [isShuffle]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INFINITY, String(isInfinity));
  }, [isInfinity]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTO_RECOMMEND, String(isAutoRecommend));
  }, [isAutoRecommend]);

  // Load initial queue recommendations for starting track on mount
  useEffect(() => {
    if (INITIAL_SONGS[0]) {
      fetchRecommendations(INITIAL_SONGS[0]);
    }
  }, []);

  // Connect AudioEngine Callbacks
  useEffect(() => {
    audioEngine.setCallbacks(
      (time) => {
        setCurrentTime(time);
      },
      () => {
        handleTrackEnded();
      }
    );
  }, [currentSong, queue, repeatMode, isShuffle, isInfinity, recommendations]);

  // Mobile Phone MediaSession API Integration (Lock Screen, Control Center, Bluetooth controls)
  useEffect(() => {
    mediaSessionManager.init({
      onPlay: () => {
        audioEngine.play();
        setIsPlaying(true);
      },
      onPause: () => {
        audioEngine.pause();
        setIsPlaying(false);
      },
      onNext: () => handleNextTrack(),
      onPrevious: () => handlePreviousTrack(),
      onSeek: (seconds) => handleSeek(seconds),
    });
  }, [queue, currentSong, repeatMode, isShuffle, isInfinity, recommendations]);

  useEffect(() => {
    mediaSessionManager.updatePlaybackState(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    mediaSessionManager.updatePositionState(duration, currentTime, playbackSpeed);
  }, [duration, currentTime, playbackSpeed]);

  const triggerHaptic = (ms = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(ms);
      } catch {}
    }
  };

  // Handle Track Completion
  const handleTrackEnded = () => {
    if (repeatMode === 'one') {
      audioEngine.seek(0);
      audioEngine.play();
      return;
    }

    handleNextTrack();
  };

  // Smart queue recommendation engine: finds all relevant songs after any song is played
  const fetchRecommendations = async (targetSong: Song) => {
    setIsLoadingRecommendations(true);

    // 1. Instantly match relevant songs from existing catalogue (same artist, same genre or mood)
    const localMatches = songs.filter((s) => {
      if (s.id === targetSong.id) return false;
      const sameArtist = s.artist.toLowerCase() === targetSong.artist.toLowerCase();
      const genreA = (s.genre || '').toLowerCase();
      const genreB = (targetSong.genre || '').toLowerCase();
      const sameGenre =
        genreA.includes(genreB) ||
        genreB.includes(genreA) ||
        genreA.split('/')[0].trim() === genreB.split('/')[0].trim();
      return sameArtist || sameGenre;
    });

    // Prioritize same artist first, then same genre
    localMatches.sort((a, b) => {
      if (a.artist === targetSong.artist && b.artist !== targetSong.artist) return -1;
      if (b.artist === targetSong.artist && a.artist !== targetSong.artist) return 1;
      return (b.plays || 0) - (a.plays || 0);
    });

    let combinedRecs: Song[] = [...localMatches];
    setRecommendations(combinedRecs);

    // 2. Fetch rich YouTube Music radio / similar recommendations if online
    try {
      const vId = targetSong.videoId || (targetSong.id.startsWith('track-') ? '' : targetSong.id);
      const params = new URLSearchParams({
        videoId: vId,
        artist: targetSong.artist,
        genre: targetSong.genre,
        title: targetSong.title,
      });

      const res = await fetch(`/api/yt/recommendations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          const existingIds = new Set(combinedRecs.map((r) => r.id));
          const ytRecs = data.recommendations.filter(
            (r: Song) => r.id !== targetSong.id && !existingIds.has(r.id)
          );
          combinedRecs = [...combinedRecs, ...ytRecs];
          setRecommendations(combinedRecs);
        }
      }
    } catch {
      // Offline or network error - local matches remain intact
    } finally {
      setIsLoadingRecommendations(false);
    }

    // 3. Automatically add relevant songs to queue if isAutoRecommend is enabled (default)
    if (isAutoRecommend && combinedRecs.length > 0) {
      setQueue((prevQueue) => {
        const existingQueueIds = new Set(prevQueue.map((s) => s.id));
        const newTracksToAdd = combinedRecs
          .filter((s) => !existingQueueIds.has(s.id) && s.id !== targetSong.id)
          .slice(0, 5);

        if (newTracksToAdd.length > 0) {
          return [...prevQueue, ...newTracksToAdd];
        }
        return prevQueue;
      });
    }
  };

  // Play Song Action
  const playSong = async (song: Song) => {
    let playableSong: Song = { ...song };

    // Fetch synchronized lyrics if missing
    if ((!playableSong.lyrics || playableSong.lyrics.length === 0) && (playableSong.videoId || playableSong.title)) {
      const qParams = new URLSearchParams({
        title: playableSong.title,
        artist: playableSong.artist,
        videoId: playableSong.videoId || (playableSong.id.startsWith('track-') ? '' : playableSong.id),
      });

      fetch(`/api/yt/lyrics?${qParams.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.lyrics && data.lyrics.length > 0) {
            setCurrentSong((prev) => (prev.id === playableSong.id ? { ...prev, lyrics: data.lyrics } : prev));
          }
        })
        .catch(() => {});
    }

    setCurrentSong(playableSong);
    setDuration(playableSong.duration || 180);
    setCurrentTime(0);
    setIsPlaying(true);

    // Update play stats
    setStats((prev) => {
      const currentCount = prev.playedTrackCounts[song.id] || 0;
      return {
        ...prev,
        totalMinutes: prev.totalMinutes + Math.round((song.duration || 180) / 60),
        playedTrackCounts: {
          ...prev.playedTrackCounts,
          [song.id]: currentCount + 1,
        },
      };
    });

    // Update mobile phone lock screen / notification media controls
    mediaSessionManager.updateMetadata(playableSong);

    // Generate queue recommendations of all relevant songs after played any song
    fetchRecommendations(playableSong);

    await audioEngine.loadAndPlay(playableSong, 0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds: number) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
  };

  const handleNextTrack = () => {
    if (queue.length === 0) return;

    if (isShuffle) {
      if (queue.length === 1) {
        if (isInfinity && recommendations.length > 0) {
          const nextRec = recommendations.find((r) => r.id !== currentSong.id) || recommendations[0];
          setQueue((prev) => [...prev, nextRec]);
          playSong(nextRec);
          return;
        }
        playSong(queue[0]);
        return;
      }
      // Pick random index different from current
      const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
      let randIdx = Math.floor(Math.random() * queue.length);
      if (randIdx === currentIndex) {
        randIdx = (randIdx + 1) % queue.length;
      }
      playSong(queue[randIdx]);
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      playSong(queue[currentIndex + 1]);
    } else if (repeatMode === 'all') {
      playSong(queue[0]);
    } else if (isInfinity && recommendations.length > 0) {
      // Infinity mode: Endless autoplay of relevant recommendations
      const queueIds = new Set(queue.map((s) => s.id));
      const nextRec = recommendations.find((r) => !queueIds.has(r.id)) || recommendations[0];
      setQueue((prev) => [...prev, nextRec]);
      playSong(nextRec);
    } else {
      audioEngine.pause();
      setIsPlaying(false);
    }
  };

  const handlePreviousTrack = () => {
    if (currentTime > 4) {
      handleSeek(0);
      return;
    }
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex > 0) {
      playSong(queue[currentIndex - 1]);
    } else {
      playSong(queue[queue.length - 1]);
    }
  };

  const toggleLike = (songId: string) => {
    setLikedSongIds((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
    );
  };

  // 3-Tap Loop Mode Toggle: Loop Off -> Loop All -> Loop Once -> Loop Off
  const toggleRepeat = () => {
    const modes: PlaybackRepeat[] = ['off', 'all', 'one'];
    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(next);
    const modeLabels: Record<PlaybackRepeat, string> = {
      off: 'Loop Off',
      all: 'Loop All',
      one: 'Loop Once',
    };
    showShortcutFeedback('Loop', modeLabels[next]);
  };

  const toggleShuffle = () => {
    const next = !isShuffle;
    setIsShuffle(next);
    showShortcutFeedback('Shuffle', next ? 'Shuffle ON' : 'Shuffle OFF');
  };

  const toggleInfinity = () => {
    const next = !isInfinity;
    setIsInfinity(next);
    showShortcutFeedback('Infinity', next ? 'Endless Autoplay ON' : 'Endless Autoplay OFF');
  };

  const toggleAutoRecommend = () => {
    const next = !isAutoRecommend;
    setIsAutoRecommend(next);
    showShortcutFeedback('Queue Recs', next ? 'Auto Mode (Default)' : 'Manual Mode');

    // If switching to auto mode and recommendations exist, append un-queued tracks
    if (next && recommendations.length > 0) {
      setQueue((prev) => {
        const queueIds = new Set(prev.map((s) => s.id));
        const toAdd = recommendations.filter((r) => !queueIds.has(r.id)).slice(0, 5);
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      });
    }
  };

  const handleAddRecommendationToQueue = (song: Song) => {
    setQueue((prev) => {
      if (prev.some((s) => s.id === song.id)) return prev;
      return [...prev, song];
    });
    showShortcutFeedback('Queue', `Added "${song.title.slice(0, 18)}"`);
  };

  const handleAddAllRecommendations = () => {
    setQueue((prev) => {
      const queueIds = new Set(prev.map((s) => s.id));
      const toAdd = recommendations.filter((r) => !queueIds.has(r.id));
      if (toAdd.length === 0) return prev;
      showShortcutFeedback('Queue', `Added ${toAdd.length} recommendations`);
      return [...prev, ...toAdd];
    });
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    setIsMuted(false);
    audioEngine.setVolume(vol);
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioEngine.setMute(nextMute);
  };

  const handleSpeedChange = (spd: number) => {
    setPlaybackSpeed(spd);
    audioEngine.setPlaybackRate(spd);
  };

  // Sleep Timer countdown handler
  const handleSetSleepTimer = (minutes: number | null) => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    setSleepTimerRemaining(minutes);

    if (minutes !== null) {
      let remaining = minutes;
      sleepTimerRef.current = window.setInterval(() => {
        remaining -= 1;
        setSleepTimerRemaining(remaining);
        if (remaining <= 0) {
          audioEngine.pause();
          setIsPlaying(false);
          setSleepTimerRemaining(null);
          if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
        }
      }, 60000);
    }
  };

  // Keyboard shortcut feedback HUD toast
  const [keyboardToast, setKeyboardToast] = useState<{ key: string; action: string } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showShortcutFeedback = (key: string, action: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setKeyboardToast({ key, action });
    toastTimeoutRef.current = window.setTimeout(() => {
      setKeyboardToast(null);
    }, 1200);
  };

  // Global Keyboard Event Listener for playback shortcuts (Space, Arrows, J/K, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when the user is typing in form inputs, textareas, etc.
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // 1. Space: Play / Pause
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
        showShortcutFeedback('Space', isPlaying ? 'Pause' : 'Play');
        return;
      }

      // 2. ArrowLeft: Seek backward 5 seconds
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newTime = Math.max(0, currentTime - 5);
        handleSeek(newTime);
        showShortcutFeedback('←', `-5s (${Math.floor(newTime)}s)`);
        return;
      }

      // 3. ArrowRight: Seek forward 5 seconds
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newTime = Math.min(duration, currentTime + 5);
        handleSeek(newTime);
        showShortcutFeedback('→', `+5s (${Math.floor(newTime)}s)`);
        return;
      }

      // 4. J or j: Previous track
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handlePreviousTrack();
        showShortcutFeedback('J', 'Previous Track');
        return;
      }

      // 5. K or k: Next track
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleNextTrack();
        showShortcutFeedback('K', 'Next Track');
        return;
      }

      // 6. ArrowUp: Volume up by 5%
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextVol = Math.min(1, Math.round((volume + 0.05) * 100) / 100);
        handleVolumeChange(nextVol);
        showShortcutFeedback('↑', `Volume ${Math.round(nextVol * 100)}%`);
        return;
      }

      // 7. ArrowDown: Volume down by 5%
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextVol = Math.max(0, Math.round((volume - 0.05) * 100) / 100);
        handleVolumeChange(nextVol);
        showShortcutFeedback('↓', `Volume ${Math.round(nextVol * 100)}%`);
        return;
      }

      // 8. M or m: Mute / Unmute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        showShortcutFeedback('M', isMuted ? 'Unmuted' : 'Muted');
        return;
      }

      // 9. L or R: 3-Tap Loop (Off -> All -> Once)
      if (e.key === 'l' || e.key === 'L' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        toggleRepeat();
        return;
      }

      // 10. S or s: Shuffle
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        toggleShuffle();
        return;
      }

      // 11. I or i: Infinity Autoplay
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        toggleInfinity();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, currentTime, duration, volume, isMuted, currentSong, queue, isShuffle, repeatMode, isInfinity]);

  // Playlist Actions
  const handleCreatePlaylist = (title: string, description: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      title,
      description,
      coverGradient: 'from-fuchsia-600 via-purple-700 to-indigo-950',
      songIds: [currentSong.id],
      createdAt: new Date().toISOString().slice(0, 10),
      isCustom: true,
    };
    setPlaylists((prev) => [newPl, ...prev]);
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlaylist?.id === id) {
      setSelectedPlaylist(null);
    }
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, songIds: p.songIds.filter((id) => id !== songId) } : p
      )
    );
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist((prev) =>
        prev ? { ...prev, songIds: prev.songIds.filter((id) => id !== songId) } : null
      );
    }
  };

  const handlePlayAllFromPlaylist = (playlistSongs: Song[], shuffle = false) => {
    if (playlistSongs.length === 0) return;
    setQueue(playlistSongs);
    if (shuffle) {
      setIsShuffle(true);
      const rand = Math.floor(Math.random() * playlistSongs.length);
      playSong(playlistSongs[rand]);
    } else {
      setIsShuffle(false);
      playSong(playlistSongs[0]);
    }
  };

  const handleAddToQueue = (song: Song) => {
    setQueue((prev) => [...prev, song]);
  };

  const handleAddLocalSong = (newSong: Song) => {
    setSongs((prev) => [newSong, ...prev]);
    setQueue((prev) => [newSong, ...prev]);
  };

  const handleResetData = () => {
    setPlaylists(INITIAL_PLAYLISTS);
    setLikedSongIds(['track-1', 'track-2']);
    setColorTheme('monet-teal');
    setThemeBrightness('dark');
  };

  // Background styling based on theme
  const getThemeBgClass = () => {
    if (themeBrightness === 'oled') return 'bg-black text-white';
    if (themeBrightness === 'light') return 'bg-slate-50 text-slate-900';
    return 'bg-zinc-950 text-white';
  };

  const accentHex = ACCENT_COLORS[colorTheme] || '#14b8a6';

  return (
    <div className={`min-h-screen ${getThemeBgClass()} flex flex-col transition-colors duration-300 font-sans`}>
      {/* Offline Connectivity Notification Banner */}
      <OfflineIndicator />

      {/* Keyboard Shortcut HUD Toast Feedback */}
      {keyboardToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-zinc-900/95 border border-white/20 text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          <kbd className="px-2 py-0.5 rounded-lg bg-white/10 font-mono text-xs font-bold text-indigo-300 border border-white/10">
            {keyboardToast.key}
          </kbd>
          <span className="text-xs font-semibold">{keyboardToast.action}</span>
        </div>
      )}

      {/* 
        ========================================================================
        TOP BAR CONTRACT:
        Zone 1: Brand Wordmark (Single element)
        Zone 2: 4-5 Navigation Links (Single-line whitespace-nowrap)
        Zone 3: 1 Primary Action Point (Settings, PWA Install & EQ Modal triggers)
        ========================================================================
      */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl shrink-0">
        {/* Zone 1: Brand Wordmark */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 group"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:rotate-180 duration-700 shadow-md"
            style={{ backgroundColor: accentHex }}
          >
            <Disc className="w-4 h-4 text-black fill-black" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
            FabTune
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
          <button
            onClick={() => setActiveTab('home')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'home'
                ? 'text-white font-bold border-b-2'
                : 'hover:text-white'
            }`}
            style={{ borderColor: activeTab === 'home' ? accentHex : 'transparent' }}
          >
            Discover
          </button>

          <button
            onClick={() => setActiveTab('explore')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'explore'
                ? 'text-white font-bold border-b-2'
                : 'hover:text-white'
            }`}
            style={{ borderColor: activeTab === 'explore' ? accentHex : 'transparent' }}
          >
            Charts &amp; Moods
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'library'
                ? 'text-white font-bold border-b-2'
                : 'hover:text-white'
            }`}
            style={{ borderColor: activeTab === 'library' ? accentHex : 'transparent' }}
          >
            Library
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'search'
                ? 'text-white font-bold border-b-2'
                : 'hover:text-white'
            }`}
            style={{ borderColor: activeTab === 'search' ? accentHex : 'transparent' }}
          >
            Search
          </button>

          <button
            onClick={() => setShowWrapped(true)}
            className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Wrapped &apos;24</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAndroidApkModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-950/40"
            title="Download FabTune Android APK"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Android APK</span>
            <span className="md:hidden">APK</span>
          </button>

          <PWAInstallButton variant="header" />

          <button
            onClick={() => setShowFullPlayer(true)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Open Equalizer & Player"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Equalizer</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-colors"
            title="Appearance & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-36 md:pb-28">
        {activeTab === 'home' && (
          <HomeView
            songs={songs}
            playlists={playlists}
            currentSong={currentSong}
            isPlaying={isPlaying}
            likedSongIds={likedSongIds}
            onPlaySong={playSong}
            onTogglePlay={togglePlay}
            onToggleLike={toggleLike}
            onSelectPlaylist={(pl) => setSelectedPlaylist(pl)}
            onOpenWrapped={() => setShowWrapped(true)}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreView
            songs={songs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            likedSongIds={likedSongIds}
            onPlaySong={playSong}
            onToggleLike={toggleLike}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            songs={songs}
            playlists={playlists}
            likedSongIds={likedSongIds}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlaySong={playSong}
            onTogglePlay={togglePlay}
            onToggleLike={toggleLike}
            onSelectPlaylist={(pl) => setSelectedPlaylist(pl)}
            onCreatePlaylist={handleCreatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onAddLocalSong={handleAddLocalSong}
            onImportBackup={(data) => {
              setPlaylists(data.playlists);
              setLikedSongIds(data.likedSongIds);
            }}
          />
        )}

        {activeTab === 'search' && (
          <SearchView
            songs={songs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            likedSongIds={likedSongIds}
            onPlaySong={playSong}
            onToggleLike={toggleLike}
            onAddToQueue={handleAddToQueue}
          />
        )}
      </main>

      {/* Mobile Phone Bottom Navigation Bar (Docked to device bottom with safe-area support) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 grid grid-cols-4 items-center h-14 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
      >
        <button
          onClick={() => {
            triggerHaptic();
            setActiveTab('home');
          }}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            activeTab === 'home' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          style={{ color: activeTab === 'home' ? accentHex : undefined }}
        >
          <Disc className={`w-4 h-4 ${activeTab === 'home' ? 'animate-spin-slow' : ''}`} />
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic();
            setActiveTab('explore');
          }}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            activeTab === 'explore' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          style={{ color: activeTab === 'explore' ? accentHex : undefined }}
        >
          <Compass className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 font-medium">Explore</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic();
            setActiveTab('library');
          }}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            activeTab === 'library' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          style={{ color: activeTab === 'library' ? accentHex : undefined }}
        >
          <Library className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 font-medium">Library</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic();
            setActiveTab('search');
          }}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            activeTab === 'search' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          style={{ color: activeTab === 'search' ? accentHex : undefined }}
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 font-medium">Search</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic();
            setShowAndroidApkModal(true);
          }}
          className="flex flex-col items-center justify-center py-1 transition-all active:scale-95 text-zinc-400 hover:text-emerald-300"
          title="Download FabTune Android APK"
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] mt-0.5 font-medium text-emerald-400/90">Get APK</span>
        </button>
      </nav>

      {/* Pinned Bottom MiniPlayer */}
      {currentSong && (
        <MiniPlayer
          song={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          isLiked={likedSongIds.includes(currentSong.id)}
          onTogglePlay={togglePlay}
          onNext={handleNextTrack}
          onToggleLike={toggleLike}
          onOpenFullPlayer={() => setShowFullPlayer(true)}
          repeatMode={repeatMode}
          onToggleRepeat={toggleRepeat}
          isShuffle={isShuffle}
          onToggleShuffle={toggleShuffle}
          isInfinity={isInfinity}
          onToggleInfinity={toggleInfinity}
        />
      )}

      {/* Full Player Modal */}
      {showFullPlayer && currentSong && (
        <FullPlayerModal
          song={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          repeatMode={repeatMode}
          isShuffle={isShuffle}
          isLiked={likedSongIds.includes(currentSong.id)}
          queue={queue}
          speed={playbackSpeed}
          remainingSleepTimerMinutes={sleepTimerRemaining}
          onClose={() => setShowFullPlayer(false)}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          onNext={handleNextTrack}
          onPrevious={handlePreviousTrack}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onToggleRepeat={toggleRepeat}
          onToggleShuffle={toggleShuffle}
          onToggleLike={toggleLike}
          onSpeedChange={handleSpeedChange}
          onSetSleepTimer={handleSetSleepTimer}
          onPlayQueueSong={playSong}
          onRemoveQueueSong={(songId) => setQueue((prev) => prev.filter((s) => s.id !== songId))}
          isInfinity={isInfinity}
          onToggleInfinity={toggleInfinity}
          recommendations={recommendations}
          isLoadingRecommendations={isLoadingRecommendations}
          isAutoRecommend={isAutoRecommend}
          onToggleAutoRecommend={toggleAutoRecommend}
          onAddRecommendationToQueue={handleAddRecommendationToQueue}
          onAddAllRecommendations={handleAddAllRecommendations}
          onRefreshRecommendations={() => fetchRecommendations(currentSong)}
        />
      )}

      {/* Playlist Detail Modal */}
      {selectedPlaylist && (
        <PlaylistDetailModal
          playlist={selectedPlaylist}
          songs={songs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          likedSongIds={likedSongIds}
          onPlaySong={playSong}
          onTogglePlay={togglePlay}
          onToggleLike={toggleLike}
          onClose={() => setSelectedPlaylist(null)}
          onPlayAll={handlePlayAllFromPlaylist}
          onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
        />
      )}

      {/* FabTune Wrapped Modal */}
      {showWrapped && (
        <WrappedModal
          stats={stats}
          songs={songs}
          onPlaySong={playSong}
          onClose={() => setShowWrapped(false)}
        />
      )}

      {/* Settings & Appearance Modal */}
      {showSettings && (
        <SettingsModal
          colorTheme={colorTheme}
          themeBrightness={themeBrightness}
          onColorThemeChange={setColorTheme}
          onThemeBrightnessChange={setThemeBrightness}
          onClose={() => setShowSettings(false)}
          onResetData={handleResetData}
          onOpenAndroidApk={() => {
            setShowSettings(false);
            setShowAndroidApkModal(true);
          }}
        />
      )}

      {/* Android APK Download Modal */}
      {showAndroidApkModal && (
        <AndroidApkModal
          isOpen={showAndroidApkModal}
          onClose={() => setShowAndroidApkModal(false)}
        />
      )}
    </div>
  );
}
