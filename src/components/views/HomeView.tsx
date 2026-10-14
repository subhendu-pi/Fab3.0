import React from 'react';
import { Playlist, Song } from '../../types/music';
import { CoverArt } from '../common/CoverArt';
import { Play, Pause, Sparkles, Disc, Flame, Heart, TrendingUp, Radio } from 'lucide-react';

interface HomeViewProps {
  songs: Song[];
  playlists: Playlist[];
  currentSong: Song | null;
  isPlaying: boolean;
  likedSongIds: string[];
  onPlaySong: (song: Song) => void;
  onTogglePlay: () => void;
  onToggleLike: (songId: string) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenWrapped: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  songs,
  playlists,
  currentSong,
  isPlaying,
  likedSongIds,
  onPlaySong,
  onTogglePlay,
  onToggleLike,
  onSelectPlaylist,
  onOpenWrapped,
}) => {
  const featuredSong = songs[1] || songs[0];

  return (
    <div className="space-y-8 pb-32">
      {/* Hero Spotlight Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-white/10 p-6 md:p-10 shadow-2xl">
        {/* Glow Orb */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-fuchsia-600/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-indigo-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Spotlight Release · Material 3 Sound</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
              {featuredSong.title}
            </h1>

            <p className="text-sm md:text-base text-zinc-300 max-w-xl">
              By <span className="font-semibold text-white">{featuredSong.artist}</span> · {featuredSong.album} ({featuredSong.year})
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={() => {
                  if (currentSong?.id === featuredSong.id) {
                    onTogglePlay();
                  } else {
                    onPlaySong(featuredSong);
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-sm shadow-xl transition-transform active:scale-95"
              >
                {currentSong?.id === featuredSong.id && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-black" />
                    <span>Pause Track</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                    <span>Listen Now</span>
                  </>
                )}
              </button>

              <button
                onClick={onOpenWrapped}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold text-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>View Wrapped 2024</span>
              </button>
            </div>
          </div>

          <div className="shrink-0 group cursor-pointer" onClick={() => onPlaySong(featuredSong)}>
            <CoverArt song={featuredSong} size="lg" className="shadow-2xl group-hover:scale-105 transition-transform" />
          </div>
        </div>
      </section>

      {/* Quick Picks / Daily Mixes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">Quick Picks For You</h2>
          </div>
          <span className="text-xs text-zinc-400 font-medium">Curated Stream</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {songs.slice(0, 8).map((song) => {
            const isCurrent = currentSong?.id === song.id;
            const isLiked = likedSongIds.includes(song.id);

            return (
              <div
                key={song.id}
                className={`group flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? 'bg-white/15 border-white/30 shadow-md'
                    : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5'
                }`}
              >
                <div
                  onClick={() => onPlaySong(song)}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <div className="relative shrink-0">
                    <CoverArt song={song} size="sm" />
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0 pr-2">
                    <h3
                      className={`text-sm font-semibold truncate ${
                        isCurrent ? 'text-indigo-400' : 'text-zinc-100 group-hover:text-white'
                      }`}
                    >
                      {song.title}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike(song.id);
                  }}
                  className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition-colors shrink-0"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Playlists */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">Recommended Playlists</h2>
          </div>
          <span className="text-xs text-zinc-400 font-medium">Ready to Stream</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              className="group p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div
                className={`w-full h-32 rounded-xl bg-gradient-to-br ${pl.coverGradient} flex items-center justify-center shadow-md relative overflow-hidden mb-3`}
              >
                <Disc className="w-12 h-12 text-white/50 group-hover:rotate-45 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <button className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl transition-all translate-y-2 group-hover:translate-y-0">
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {pl.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {pl.description}
                </p>
                <div className="flex items-center gap-2 mt-3 text-[11px] text-zinc-500 font-mono">
                  <span>{pl.songIds.length} Tracks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
