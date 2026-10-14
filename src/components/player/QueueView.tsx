import React from 'react';
import { Song } from '../../types/music';
import { CoverArt } from '../common/CoverArt';
import { Play, Pause, Trash2, ListMusic, Shuffle, Repeat } from 'lucide-react';

interface QueueViewProps {
  queue: Song[];
  currentSong: Song;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onRemoveFromQueue: (songId: string) => void;
  onClearQueue?: () => void;
  accentColor?: string;
}

export const QueueView: React.FC<QueueViewProps> = ({
  queue,
  currentSong,
  isPlaying,
  onPlaySong,
  onRemoveFromQueue,
  accentColor = '#818cf8',
}) => {
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col h-full max-h-[460px] p-2">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-white/10 mb-2">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-indigo-400" />
          <span>Queue ({queue.length} Tracks)</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 px-1 py-1">
        {queue.map((track, idx) => {
          const isCurrent = track.id === currentSong.id;
          return (
            <div
              key={`${track.id}-${idx}`}
              className={`flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 ${
                isCurrent
                  ? 'bg-white/10 border border-white/20'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div
                onClick={() => onPlaySong(track)}
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
              >
                <div className="relative group shrink-0">
                  <CoverArt song={track} size="sm" />
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isCurrent && isPlaying ? (
                      <Pause className="w-4 h-4 text-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                <div className="flex flex-col min-w-0 pr-2">
                  <p
                    className={`text-sm font-medium truncate ${
                      isCurrent ? 'text-white font-semibold' : 'text-zinc-200'
                    }`}
                    style={{ color: isCurrent ? accentColor : undefined }}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono tabular-nums text-zinc-400">
                  {formatDuration(track.duration)}
                </span>
                {queue.length > 1 && (
                  <button
                    onClick={() => onRemoveFromQueue(track.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
