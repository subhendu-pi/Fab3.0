import React, { useState } from 'react';
import { PlaybackRepeat, PlayerViewMode, Song } from '../../types/music';
import { CoverArt } from '../common/CoverArt';
import { VinylTurntable } from './VinylTurntable';
import { SyncedLyricsView } from './SyncedLyricsView';
import { EqualizerPanel } from './EqualizerPanel';
import { QueueView } from './QueueView';
import { SleepTimerMenu } from './SleepTimerMenu';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Moon,
  Disc,
  Image,
  AlignLeft,
  Sliders,
  ListMusic,
  Gauge,
  Share2,
} from 'lucide-react';

interface FullPlayerModalProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: PlaybackRepeat;
  isShuffle: boolean;
  isLiked: boolean;
  queue: Song[];
  speed: number;
  remainingSleepTimerMinutes: number | null;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleLike: (songId: string) => void;
  onSpeedChange: (speed: number) => void;
  onSetSleepTimer: (minutes: number | null) => void;
  onPlayQueueSong: (song: Song) => void;
  onRemoveQueueSong: (songId: string) => void;
}

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  song,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  repeatMode,
  isShuffle,
  isLiked,
  queue,
  speed,
  remainingSleepTimerMinutes,
  onClose,
  onTogglePlay,
  onSeek,
  onNext,
  onPrevious,
  onVolumeChange,
  onToggleMute,
  onToggleRepeat,
  onToggleShuffle,
  onToggleLike,
  onSpeedChange,
  onSetSleepTimer,
  onPlayQueueSong,
  onRemoveQueueSong,
}) => {
  const [activeMode, setActiveMode] = useState<PlayerViewMode>('disc');
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleShare = () => {
    navigator.clipboard?.writeText(
      `Listening to "${song.title}" by ${song.artist} on FabTune Music!`
    );
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Dynamic Background Hue Flare */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[130px] opacity-25 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: song.accentColor }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
          title="Minimize player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center max-w-xs sm:max-w-md text-center">
          <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Playing from {song.album}
          </span>
          <span className="text-xs text-indigo-400 font-mono flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Hi-Res Lossless 24-bit/96kHz
          </span>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            onClick={() => setShowSleepTimer(!showSleepTimer)}
            className={`p-2 rounded-full transition-colors ${
              remainingSleepTimerMinutes !== null
                ? 'bg-indigo-600 text-white'
                : 'hover:bg-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Sleep timer"
          >
            <Moon className="w-5 h-5" />
          </button>

          {showSleepTimer && (
            <SleepTimerMenu
              remainingMinutes={remainingSleepTimerMinutes}
              onSetTimer={onSetSleepTimer}
              onClose={() => setShowSleepTimer(false)}
            />
          )}

          <button
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
            title="Share track"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mode Navigation Tabs */}
      <div className="relative z-10 flex items-center justify-center gap-1 py-2 px-4 border-b border-white/5 bg-black/20 shrink-0">
        <button
          onClick={() => setActiveMode('disc')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeMode === 'disc'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Turntable</span>
        </button>

        <button
          onClick={() => setActiveMode('album')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeMode === 'album'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>Artwork</span>
        </button>

        <button
          onClick={() => setActiveMode('lyrics')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeMode === 'lyrics'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <AlignLeft className="w-3.5 h-3.5" />
          <span>Lyrics</span>
        </button>

        <button
          onClick={() => setActiveMode('equalizer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeMode === 'equalizer'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Equalizer</span>
        </button>

        <button
          onClick={() => setActiveMode('queue')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeMode === 'queue'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Queue ({queue.length})</span>
        </button>
      </div>

      {copyFeedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow-lg">
          Copied track info to clipboard!
        </div>
      )}

      {/* Main View Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center overflow-y-auto p-4 max-w-2xl w-full mx-auto">
        {activeMode === 'disc' && (
          <VinylTurntable
            song={song}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            speed={speed}
            onSpeedChange={onSpeedChange}
          />
        )}

        {activeMode === 'album' && (
          <div className="flex flex-col items-center justify-center py-6">
            <CoverArt song={song} size="xl" className="shadow-2xl hover:scale-105 transition-transform" />
            <div className="mt-6 text-center">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                {song.title}
              </h2>
              <p className="text-sm md:text-base text-zinc-400 mt-1">{song.artist}</p>
            </div>
          </div>
        )}

        {activeMode === 'lyrics' && (
          <SyncedLyricsView
            lyrics={song.lyrics}
            currentTime={currentTime}
            onSeek={onSeek}
            accentColor={song.accentColor}
          />
        )}

        {activeMode === 'equalizer' && (
          <EqualizerPanel isPlaying={isPlaying} accentColor={song.accentColor} />
        )}

        {activeMode === 'queue' && (
          <QueueView
            queue={queue}
            currentSong={song}
            isPlaying={isPlaying}
            onPlaySong={onPlayQueueSong}
            onRemoveFromQueue={onRemoveQueueSong}
            accentColor={song.accentColor}
          />
        )}
      </div>

      {/* Bottom Player Controller Bar */}
      <div className="relative z-20 w-full max-w-2xl mx-auto px-6 pb-6 pt-2 shrink-0">
        {/* Track Info (when in disc/lyrics/eq mode) */}
        {activeMode !== 'album' && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col min-w-0 pr-4">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                {song.title}
              </h3>
              <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
            </div>
            <button
              onClick={() => onToggleLike(song.id)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors shrink-0"
              title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-400 hover:text-white'
                }`}
              />
            </button>
          </div>
        )}

        {/* Scrubber Slider */}
        <div className="flex flex-col w-full mb-3">
          <div className="relative w-full flex items-center group cursor-pointer py-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus:outline-none accent-indigo-500"
              style={{
                background: `linear-gradient(to right, ${song.accentColor} ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%)`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="flex items-center justify-between w-full">
          {/* Shuffle Button */}
          <button
            onClick={onToggleShuffle}
            className={`p-2.5 rounded-full transition-colors ${
              isShuffle ? 'text-indigo-400 bg-white/10' : 'text-zinc-400 hover:text-white'
            }`}
            title={`Shuffle: ${isShuffle ? 'ON' : 'OFF'}`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous Track */}
          <button
            onClick={onPrevious}
            className="p-2.5 rounded-full text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Previous track"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Big Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{
              backgroundColor: song.accentColor,
              boxShadow: `0 0 25px ${song.accentColor}66`,
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-black fill-black" />
            ) : (
              <Play className="w-6 h-6 text-black fill-black ml-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNext}
            className="p-2.5 rounded-full text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Next track"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Repeat Mode Button */}
          <button
            onClick={onToggleRepeat}
            className={`p-2.5 rounded-full transition-colors ${
              repeatMode !== 'off'
                ? 'text-indigo-400 bg-white/10'
                : 'text-zinc-400 hover:text-white'
            }`}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4 text-indigo-400" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Secondary controls: Volume & Speed */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs text-zinc-400">
          {/* Volume Slider */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-20 sm:w-28 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1.5 font-mono">
            <Gauge className="w-3.5 h-3.5" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="bg-transparent text-zinc-300 border-none cursor-pointer focus:outline-none"
            >
              <option value={0.5} className="bg-zinc-900">0.5x</option>
              <option value={0.75} className="bg-zinc-900">0.75x</option>
              <option value={1.0} className="bg-zinc-900">1.0x (Norm)</option>
              <option value={1.25} className="bg-zinc-900">1.25x</option>
              <option value={1.5} className="bg-zinc-900">1.5x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
