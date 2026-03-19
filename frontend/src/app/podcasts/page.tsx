// app/podcasts/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { getAllDocuments } from "../../../lib/api";
import { Document } from "../../../lib/types";
import Loader from "../../components/Loader";
import BackToHome from "../../components/BackToHome";
import { FaPlay, FaPause, FaSearch, FaHeadphones, FaChevronDown, FaChevronUp, FaShareAlt, FaBackward, FaForward } from "react-icons/fa";

const PodcastsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [playingId, setPlayingId] = useState<number | string | null>(null);
  const [sharedEpisodeId, setSharedEpisodeId] = useState<number | string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(0);
  const [progressVisibleForId, setProgressVisibleForId] = useState<number | string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const shareEpisode = useCallback(async (podcast: Document) => {
    if (typeof window === "undefined") return;
    const base = window.location.origin + window.location.pathname;
    const url = `${base}#episode-${podcast.id}`;
    const title = podcast.title ? `${podcast.title} – Feedforward Podcasts` : "Feedforward Podcasts";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setSharedEpisodeId(podcast.id);
        setTimeout(() => setSharedEpisodeId(null), 2000);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        try {
          await navigator.clipboard?.writeText(url);
          setSharedEpisodeId(podcast.id);
          setTimeout(() => setSharedEpisodeId(null), 2000);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        const data = await getAllDocuments();
        setDocuments(data.documents);
      } catch (err) {
        console.error("Error fetching podcasts:", err);
        setError("Failed to load podcasts");
      } finally {
        setLoading(false);
      }
    };

    fetchPodcasts();
  }, []);

  const podcastDocs = useMemo(() => {
    const mime = (file: Document["file"]) => file?.mime ?? file?.mimeType ?? "";
    return documents.filter((doc) => mime(doc.file).toLowerCase().startsWith("audio/"));
  }, [documents]);

  const filteredPodcasts = useMemo(() => {
    const list = !searchQuery
      ? podcastDocs
      : podcastDocs.filter((doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    const hasOrder = list.some((d) => d.order != null && !Number.isNaN(d.order));
    if (hasOrder) {
      return [...list].sort((a, b) => {
        const oA = a.order ?? 999;
        const oB = b.order ?? 999;
        return oA - oB;
      });
    }
    return [...list].sort((a, b) => {
      const dateA = (a.publishedDate ?? a.publishedAt) ? new Date(a.publishedDate ?? a.publishedAt).getTime() : 0;
      const dateB = (b.publishedDate ?? b.publishedAt) ? new Date(b.publishedDate ?? b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [podcastDocs, searchQuery]);

  // Deep link: open to specific episode from shared link (#episode-123)
  useEffect(() => {
    if (typeof window === "undefined" || !podcastDocs.length) return;
    const hash = window.location.hash;
    const match = hash && hash.startsWith("#episode-") ? hash.slice("#episode-".length) : null;
    if (match) {
      // Strapi may return document ids as either number or string (differs by env).
      // Normalize by comparing as strings, then store the real id value for correct strict equality later.
      const foundPodcast = podcastDocs.find((p) => String(p.id) === String(match));
      if (foundPodcast) {
        setExpandedId(foundPodcast.id);
        setSearchQuery("");
        setTimeout(() => {
          document.getElementById(`episode-${foundPodcast.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [podcastDocs]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleExpand = useCallback((id: number | string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const play = useCallback(
    (podcast: Document) => {
      const fileUrl = podcast.file?.url
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${podcast.file.url}`
        : null;
      if (!fileUrl || !audioRef.current) return;
      const audio = audioRef.current;
      if (playingId !== podcast.id) {
        setCurrentTime(0);
        setDuration(0);
        audio.src = fileUrl;
        audio.play().catch(console.error);
        setPlayingId(podcast.id);
        setProgressVisibleForId(podcast.id);
        setIsAudioPlaying(true);
      } else {
        audio.play().catch(console.error);
        setIsAudioPlaying(true);
      }
    },
    [playingId]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsAudioPlaying(false);
  }, []);

  const seekBy = useCallback((deltaSeconds: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    const next = Math.max(0, Math.min(el.duration, el.currentTime + deltaSeconds));
    el.currentTime = next;
    setCurrentTime(next);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (el) setCurrentTime(el.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const el = audioRef.current;
    if (el && Number.isFinite(el.duration)) setDuration(el.duration);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const value = parseFloat(e.target.value);
    el.currentTime = value;
    setCurrentTime(value);
  }, []);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = audioRef.current;
      if (!el || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const time = pct * duration;
      el.currentTime = time;
      setCurrentTime(time);
    },
    [duration]
  );

  const isPlaying = (id: number | string) => playingId === id && isAudioPlaying;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <BackToHome />
      {/* Hidden single audio element for all episodes */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setPlayingId(null);
          setIsAudioPlaying(false);
          setCurrentTime(0);
          setDuration(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      <header className="mb-10 flex flex-col gap-4">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-brand-blue font-didot">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-brand-orange/90 text-white shadow-md">
            <FaHeadphones size={16} />
          </span>
          Podcasts
        </h1>
        <p className="text-subtitle font-plex text-sm md:text-base w-full">
          Dive into Feedforward conversations, interviews and explainers.
          Expand an episode for show notes.
        </p>
        <div className="relative w-full">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search episodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full pl-11 pr-4 py-2.5 text-sm font-plex text-primary bg-white rounded-lg border border-gray-200"
          />
        </div>
      </header>

      {filteredPodcasts.length === 0 ? (
        <div className="text-subtitle p-12 text-center font-plex bg-white/70 rounded-2xl border border-card space-y-2">
          {searchQuery ? (
            <p>No podcasts match your search.</p>
          ) : (
            <>
              <p className="font-medium text-primary">No podcasts showing yet.</p>
              <p className="text-sm max-w-md mx-auto">
                Add episodes in Strapi under <strong>Content Manager → Documents</strong>: create an entry with a <strong>Title</strong>, optional <strong>Description</strong>, and upload an <strong>audio file</strong> (e.g. MP3), then <strong>Publish</strong>. In <strong>Settings → Users & Permissions → Roles → Public</strong>, enable <strong>Document → find</strong> so the app can load them.
              </p>
            </>
          )}
        </div>
      ) : (
        <section className="space-y-4">
          {filteredPodcasts.map((podcast) => {
            const fileUrl = podcast.file?.url
              ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${podcast.file.url}`
              : null;
            const expanded = expandedId === podcast.id;
            const playing = isPlaying(podcast.id);

            return (
              <article
                key={podcast.id}
                id={`episode-${podcast.id}`}
                className="rounded-2xl bg-white border border-card shadow-sm overflow-hidden scroll-mt-4"
              >
                {/* Tile: icon, title, playback group (rewind 15 | play | forward 15), share, expand */}
                <div className="w-full flex items-center gap-4 px-6 py-5 min-h-[88px]">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue shrink-0">
                    <FaHeadphones size={20} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-plex text-subtitle mb-1">
                      <span>Episode</span>
                      <span>·</span>
                      <span>{formatDate(podcast.publishedDate ?? podcast.publishedAt)}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-brand-blue font-didot break-words">
                      {podcast.title}
                    </h2>
                  </div>
                  {fileUrl ? (
                    <div
                      className="flex items-center rounded-full bg-gray-50/80 border border-gray-200/80 p-px gap-0 shrink-0"
                      role="group"
                      aria-label="Playback controls"
                    >
                      <button
                        type="button"
                        onClick={() => seekBy(-15)}
                        disabled={!playing}
                        className="inline-flex items-center justify-center min-w-[32px] min-h-[32px] w-8 h-8 rounded-full text-gray-500 hover:text-brand-blue hover:bg-white hover:shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
                        aria-label="Rewind 15 seconds"
                        title="Rewind 15 seconds"
                      >
                        <FaBackward size={11} />
                        <span className="sr-only">15</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => (playing ? pause() : play(podcast))}
                        className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] w-9 h-9 rounded-full text-white bg-brand-orange hover:bg-amber-500 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1"
                        aria-label={playing ? "Pause" : "Play"}
                      >
                        {playing ? <FaPause size={12} /> : <FaPlay size={12} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => seekBy(15)}
                        disabled={!playing}
                        className="inline-flex items-center justify-center min-w-[32px] min-h-[32px] w-8 h-8 rounded-full text-gray-500 hover:text-brand-blue hover:bg-white hover:shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
                        aria-label="Forward 15 seconds"
                        title="Forward 15 seconds"
                      >
                        <FaForward size={11} />
                        <span className="sr-only">15</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-subtitle shrink-0">No audio</span>
                  )}
                  <button
                    type="button"
                    onClick={() => shareEpisode(podcast)}
                    className="inline-flex items-center justify-center min-w-[32px] min-h-[32px] w-8 h-8 rounded-full text-brand-blue border-2 border-brand-blue hover:bg-brand-blue hover:text-white transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1"
                    aria-label={sharedEpisodeId === podcast.id ? "Link copied!" : "Share this episode"}
                    title={sharedEpisodeId === podcast.id ? "Link copied!" : "Share this episode"}
                  >
                    <FaShareAlt size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(podcast.id)}
                    className="shrink-0 min-w-[32px] min-h-[32px] inline-flex items-center justify-center p-1 text-subtitle hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Collapse show notes" : "Show notes"}
                  >
                    {expanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                  </button>
                </div>

                {/* Progress bar and duration when this episode is playing or was just stopped */}
                {(playing || progressVisibleForId === podcast.id) && fileUrl && (
                  <div className="px-6 pb-4 pt-0">
                    <div className="flex items-center justify-between gap-3 text-xs font-plex text-subtitle mb-1.5">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <div
                      role="slider"
                      aria-label="Playback position"
                      aria-valuemin={0}
                      aria-valuemax={duration || 100}
                      aria-valuenow={currentTime}
                      tabIndex={0}
                      onClick={handleProgressClick}
                      onKeyDown={(e) => {
                        const el = audioRef.current;
                        if (!el || !duration) return;
                        const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 10 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -10 : 0;
                        if (step !== 0) {
                          e.preventDefault();
                          const next = Math.max(0, Math.min(duration, el.currentTime + step));
                          el.currentTime = next;
                          setCurrentTime(next);
                        }
                      }}
                      className="h-2 w-full rounded-full bg-gray-200 cursor-pointer overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-brand-blue transition-[width] duration-75"
                        style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                )}

                {/* Dropdown: show notes only */}
                {expanded && (
                  <div className="border-t border-card px-6 py-4 bg-gray-50/50">
                    {podcast.description ? (
                      <div className="text-sm text-subtitle font-plex whitespace-pre-wrap">
                        {podcast.description}
                      </div>
                    ) : (
                      <p className="text-sm text-subtitle font-plex italic">No show notes for this episode.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          <p className="mt-4 text-xs text-subtitle font-plex">
            Showing {filteredPodcasts.length} episode{filteredPodcasts.length !== 1 ? "s" : ""}.
          </p>
        </section>
      )}
    </div>
  );
};

export default PodcastsPage;
