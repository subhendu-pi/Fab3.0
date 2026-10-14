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
import {
  Disc,
  Compass,
  Library,
  Search,
  Sparkles,
  Settings,
  Sliders,
} from 'lucide-react';

const STORAGE_KEY_LIKES = 'fabtune_liked_ids';
const STORAGE_KEY_PLAYLISTS = 'fabtune_playlists';
const STORAGE_KEY_THEME = 'fabtune_theme';
const STORAGE_KEY_BRIGHTNESS = 'fabtune_brightness';
const STORAGE_KEY_STATS = 'fabtune_stats';

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
  const [repeatMode, setRepeatMode] = useState<PlaybackRepeat>('all');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Views & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showFullPlayer, setShowFullPlayer] = useState<boolean>(false);
  const [showWrapped, setShowWrapped] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

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
  }, [currentSong, queue, repeatMode, isShuffle]);

  // Handle Track Completion
  const handleTrackEnded = () => {
    if (repeatMode === 'one') {
      audioEngine.seek(0);
      audioEngine.play();
      return;
    }

    handleNextTrack();
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
      const randomIndex = Math.floor(Math.random() * queue.length);
      playSong(queue[randomIndex]);
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex < queue.length - 1) {
      playSong(queue[currentIndex + 1]);
    } else if (repeatMode === 'all') {
      playSong(queue[0]);
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

  const toggleRepeat = () => {
    const modes: PlaybackRepeat[] = ['off', 'all', 'one'];
    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(next);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-6">
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

      {/* Mobile Bottom Navigation (Visible on narrow mobile viewports) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-16 inset-x-0 z-30 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 grid grid-cols-4 items-center h-12"
      >
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center py-1 ${
            activeTab === 'home' ? 'text-indigo-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Disc className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('explore')}
          className={`flex flex-col items-center justify-center py-1 ${
            activeTab === 'explore' ? 'text-indigo-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Explore</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center justify-center py-1 ${
            activeTab === 'library' ? 'text-indigo-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Library className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Library</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center py-1 ${
            activeTab === 'search' ? 'text-indigo-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Search</span>
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
        />
      )}
    </div>
  );
}
