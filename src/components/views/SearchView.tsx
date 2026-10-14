import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../../types/music';
import { CoverArt } from '../common/CoverArt';
import {
  Search,
  Play,
  Pause,
  Heart,
  Sparkles,
  X,
  Plus,
  Loader2,
  Globe,
  Music2,
} from 'lucide-react';

interface SearchViewProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  likedSongIds: string[];
  onPlaySong: (song: Song) => void;
  onToggleLike: (songId: string) => void;
  onAddToQueue: (song: Song) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  songs,
  currentSong,
  isPlaying,
  likedSongIds,
  onPlaySong,
  onToggleLike,
  onAddToQueue,
}) => {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'songs' | 'artists' | 'genres'>('all');
  const [onlineResults, setOnlineResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const searchTimeoutRef = useRef<number | null>(null);

  const popularSearches = [
    'The Weeknd',
    'Daft Punk',
    'Lofi Hip Hop',
    'Cyberpunk Synthwave',
    'Billie Eilish',
    'Taylor Swift',
    'Hans Zimmer',
    'Coldplay',
  ];

  // Fetch search suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/yt/suggestions?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions((data.suggestions || []).slice(0, 5));
        }
      } catch (e) {
        // quiet fail
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch online YouTube Music search results
  useEffect(() => {
    if (!query.trim()) {
      setOnlineResults([]);
      setIsLoading(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsLoading(true);

    searchTimeoutRef.current = window.setInterval(async () => {
      if (searchTimeoutRef.current) clearInterval(searchTimeoutRef.current);

      try {
        const filterParam = selectedFilter === 'all' ? 'songs' : selectedFilter;
        const res = await fetch(
          `/api/yt/search?q=${encodeURIComponent(query.trim())}&filter=${filterParam}`
        );

        if (res.ok) {
          const data = await res.json();
          const mapped: Song[] = (data.results || []).map((r: any) => ({
            id: r.id,
            videoId: r.videoId,
            title: r.title,
            artist: r.artist,
            album: r.album || 'YouTube Music',
            duration: r.duration || 180,
            genre: 'YouTube Music',
            year: new Date().getFullYear(),
            plays: r.plays || 50000,
            coverGradient: 'from-indigo-600 via-purple-700 to-slate-900',
            accentColor: '#14b8a6',
            coverArtworkType: 'lofi',
            coverUrl: r.coverUrl,
            audioType: 'youtube',
            lyrics: [],
          }));
          setOnlineResults(mapped);
        }
      } catch (err) {
        console.warn('YouTube search API error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, selectedFilter]);

  // Local filtered tracks
  const localFiltered = songs.filter((s) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;

    if (selectedFilter === 'songs') return s.title.toLowerCase().includes(q);
    if (selectedFilter === 'artists') return s.artist.toLowerCase().includes(q);
    if (selectedFilter === 'genres') return s.genre.toLowerCase().includes(q);

    return (
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.album.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q)
    );
  });

  const displayResults = onlineResults.length > 0 ? onlineResults : localFiltered;

  return (
    <div className="space-y-6 pb-32">
      {/* Search Input Bar */}
      <div className="relative w-full max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search YouTube Music songs, artists, albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xl transition-all"
          />
          {isLoading && (
            <div className="absolute right-10">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
          )}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setOnlineResults([]);
              }}
              className="absolute right-3.5 text-zinc-400 hover:text-white p-1 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Auto-complete Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-14 inset-x-0 z-30 bg-zinc-900 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl space-y-1">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(sug);
                  setSuggestions([]);
                }}
                className="w-full text-left px-3 py-2 text-xs rounded-xl text-zinc-200 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-zinc-500" />
                <span>{sug}</span>
              </button>
            ))}
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'songs', 'artists', 'genres'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                selectedFilter === filter
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Quick Search Chips */}
      {!query && (
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Trending on YouTube Music</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-3.5 py-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white border border-white/5 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-2 max-w-2xl mx-auto">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium px-1">
          <div className="flex items-center gap-1.5">
            {onlineResults.length > 0 ? (
              <>
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>YouTube Music Online Search</span>
              </>
            ) : (
              <>
                <Music2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Library Results</span>
              </>
            )}
          </div>
          <span>{displayResults.length} tracks found</span>
        </div>

        {displayResults.length === 0 && !isLoading ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            No matching tracks found. Try searching for an artist or song name above.
          </div>
        ) : (
          displayResults.map((song) => {
            const isCurrent = currentSong?.id === song.id;
            const isLiked = likedSongIds.includes(song.id);

            return (
              <div
                key={song.id}
                onClick={() => onPlaySong(song)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-white/15 border-white/30'
                    : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <CoverArt song={song} size="sm" />
                  <div className="min-w-0 pr-2">
                    <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-indigo-400' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {song.artist} · <span className="opacity-75">{song.album}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToQueue(song);
                    }}
                    className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                    title="Add to up next queue"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(song.id);
                    }}
                    className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
                      }`}
                    />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaySong(song);
                    }}
                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-md"
                  >
                    {isCurrent && isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-black" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
