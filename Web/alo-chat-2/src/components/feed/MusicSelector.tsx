"use client";
import React, { useState, useEffect, useRef } from "react";
import { MusicalNoteIcon, MagnifyingGlassIcon, PlayIcon, PauseIcon, CheckIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
    name: string;
  };
  preview_url: string | null;
  uri: string;
}

interface MusicSelectorProps {
  onSelectTrack: (track: SpotifyTrack | null) => void;
  selectedTrack: SpotifyTrack | null;
}

export default function MusicSelector({ onSelectTrack, selectedTrack }: MusicSelectorProps) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load default recommendations (e.g. popular V-Pop tracks) on mount
  useEffect(() => {
    fetchDefaultTracks();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const fetchDefaultTracks = async () => {
    setLoading(true);
    try {
      // Fetch popular V-Pop tracks via iTunes Search API (completely free & public)
      const res = await fetch(
        `https://itunes.apple.com/search?term=V-Pop&media=music&limit=6`
      );
      const data = await res.json();
      
      // Map iTunes track format to our SpotifyTrack structure for compatibility
      const mappedTracks = (data.results || []).map((item: any) => ({
        id: String(item.trackId),
        name: item.trackName,
        artists: [{ name: item.artistName }],
        album: {
          images: [{ url: item.artworkUrl100 }],
          name: item.collectionName || "",
        },
        preview_url: item.previewUrl,
        uri: item.trackViewUrl || "",
      }));

      setTracks(mappedTracks);
    } catch (e) {
      console.error("Error loading default iTunes tracks:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      fetchDefaultTracks();
      return;
    }

    setLoading(true);
    try {
      // Query free iTunes Music Search API
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=10`
      );
      const data = await res.json();

      const mappedTracks = (data.results || []).map((item: any) => ({
        id: String(item.trackId),
        name: item.trackName,
        artists: [{ name: item.artistName }],
        album: {
          images: [{ url: item.artworkUrl100 }],
          name: item.collectionName || "",
        },
        preview_url: item.previewUrl,
        uri: item.trackViewUrl || "",
      }));

      setTracks(mappedTracks);
    } catch (error) {
      console.error("Error searching iTunes tracks:", error);
      toast.error("Lỗi khi tìm kiếm bài hát.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on Enter press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectTrack = (track: SpotifyTrack) => {
    if (!audioRef.current) return;

    // Toggle play if clicking on already selected track
    if (selectedTrack?.id === track.id) {
      if (track.preview_url) {
        if (playingTrackId === track.id) {
          audioRef.current.pause();
          setPlayingTrackId(null);
        } else {
          audioRef.current.src = track.preview_url;
          audioRef.current.load();
          audioRef.current.play().catch((err) => {
            console.error("Audio play error:", err);
          });
          setPlayingTrackId(track.id);
        }
      }
      return;
    }

    onSelectTrack(track);

    if (track.preview_url) {
      audioRef.current.src = track.preview_url;
      audioRef.current.load();
      audioRef.current.play().catch((err) => {
        console.error("Audio play error:", err);
      });
      setPlayingTrackId(track.id);
    } else {
      audioRef.current.pause();
      setPlayingTrackId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 bg-slate-50/70 p-4 rounded-3xl border border-gray-100 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
          <MusicalNoteIcon className="w-4 h-4" />
          <span>Thêm nhạc nền miễn phí</span>
        </div>
        {selectedTrack && (
          <button
            type="button"
            onClick={() => {
              onSelectTrack(null);
              if (audioRef.current) audioRef.current.pause();
              setPlayingTrackId(null);
            }}
            className="text-[10px] text-red-500 font-bold hover:underline"
          >
            Gỡ nhạc
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Tìm tên bài hát hoặc ca sĩ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-xs border border-gray-200 focus:border-blue-400 rounded-full pl-8 pr-4 py-2 focus:outline-none bg-white"
          />
          <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white text-xs font-bold px-4 py-2 rounded-full shadow-xs"
        >
          Tìm
        </button>
      </div>

      {/* Track List */}
      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-6 text-[10px] text-gray-400">
            Không tìm thấy bài hát nào.
          </div>
        ) : (
          tracks.map((track) => {
            const isSelected = selectedTrack?.id === track.id;
            const isPlaying = playingTrackId === track.id;
            const artistNames = track.artists.map((a) => a.name).join(", ");
            const imageUrl = track.album?.images?.[0]?.url || "";

            return (
              <div
                key={track.id}
                onClick={() => handleSelectTrack(track)}
                className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-blue-50 border-blue-200 shadow-xs"
                    : "bg-white border-gray-100 hover:border-gray-200"
                }`}
              >
                {/* Image */}
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 relative shrink-0 border border-gray-50">
                  <img src={imageUrl} alt={track.name} className="w-full h-full object-cover" />
                  {/* Play state indicator */}
                  {track.preview_url && (
                    <div
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center text-white transition-opacity ${
                        isPlaying ? "opacity-100" : "opacity-0 hover:opacity-100"
                      }`}
                    >
                      {isPlaying ? (
                        <PauseIcon className="w-4 h-4 animate-pulse" />
                      ) : (
                        <PlayIcon className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </div>

                {/* Meta details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-[11px] font-bold text-gray-900 truncate">{track.name}</h4>
                  <p className="text-[9px] text-gray-400 truncate">{artistNames}</p>
                </div>

                {/* Status Indicator */}
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <CheckIcon className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Selected Track Preview */}
      {selectedTrack && (
        <div className="flex items-center gap-2.5 bg-blue-50/50 border border-blue-100 p-2.5 rounded-2xl">
          <div className="w-8 h-8 rounded-md overflow-hidden bg-blue-100 shrink-0">
            <img
              src={selectedTrack.album?.images?.[0]?.url || ""}
              alt={selectedTrack.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-blue-700 font-bold">Đã chèn nhạc nền:</p>
            <p className="text-[10px] text-gray-700 font-semibold truncate">
              {selectedTrack.name} - {selectedTrack.artists.map((a) => a.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Persistent DOM audio element */}
      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => setPlayingTrackId(null)}
      />
    </div>
  );
}
