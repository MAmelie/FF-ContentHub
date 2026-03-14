// src/app/page.tsx
/* eslint-disable @next/next/no-img-element */
"use client";
import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAllTiles, getHomepageHero, getLogo } from "../../lib/api";
import { Tile, HomepageHero, Logo } from "@/../lib/types";
import { isAuthenticated, getUser, getDisplayName } from "../../lib/auth";
import Loader from "@/components/Loader";

function HomeContent() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [hero, setHero] = useState<HomepageHero | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  const searchQuery = searchParams.get("search") ?? "";

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }
    setAuthChecked(true);
    const user = getUser();
    if (user) {
      setUserName(getDisplayName(user));
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;

    const fetchData = async () => {
      try {
        const [tilesResponse, heroResponse, logoData] = await Promise.all([
          getAllTiles(searchQuery),
          getHomepageHero(),
          getLogo()
        ]);
        setTiles(tilesResponse.tiles);
        setHero(heroResponse);
        setLogo(logoData ?? null);
      } catch (error) {
        setError("Error fetching content.");
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchQuery, authChecked]);
  // Order for the single "Content" row: dashboard (e.g. Meeting readoutss) + content (Podcasts, Additional content)
  const CONTENT_TILE_ORDER = ["Meeting readouts", "Podcasts", "Additional content"];

  const { toolTiles, contentTiles, expertTiles } = useMemo(() => {

    console.log(tiles);

    const tools = tiles.filter((tile) => tile.category === "tool");
    const experts = tiles.filter((tile) => tile.category === "experts");
    const dashboard = tiles.filter((tile) => tile.category === "dashboard");
    const contentOnly = tiles.filter((tile) => tile.category === "content");
    const content = [...dashboard, ...contentOnly].sort((a, b) => {
      const aIdx = CONTENT_TILE_ORDER.indexOf(a.title);
      const bIdx = CONTENT_TILE_ORDER.indexOf(b.title);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    return { toolTiles: tools, contentTiles: content, expertTiles: experts };
  }, [tiles]);

  const handleTileClick = (tile: Tile) => {
    if (tile.link_to_single_type) {
      router.push(`/${tile.slug.toLowerCase()}`);
    } else if (tile.link && tile.link.trim() !== "") {
      window.location.href = tile.link;
    } else {
      router.push(`/tiles/${tile.slug.toLowerCase()}`);
    }
  };

  /** Shared tile card renderer */
  const renderTileCard = (tile: Tile, idx: number, fallbackBg: string) => (
    <div
      key={tile.id}
      className="tile-card group card-animate-in"
      style={{ "--delay": `${idx * 80}ms` } as React.CSSProperties}
      onClick={() => handleTileClick(tile)}
    >
      <div className={`relative h-56 w-full overflow-hidden ${fallbackBg}`}>
        {tile.cover?.url && (
          <img
            src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${tile.cover.url}`}
            alt={tile.title}
            className="tile-card__img w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>
      <div className="p-6">
        <h3 className="text-base font-semibold font-didot text-primary line-clamp-2">
          {tile.title}
        </h3>
        {tile.description && (
          <p className="text-secondary mt-2 text-sm leading-relaxed line-clamp-3 font-plex">
            {tile.description}
          </p>
        )}
      </div>
    </div>
  );


  return (
    <div className="home-bg min-h-screen relative overflow-hidden">
      {/* ─── Decorative Blobs ─────────────────────── */}
      <div className="home-blob absolute -top-24 -right-24 w-80 h-80 bg-peach opacity-20" />
      <div className="home-blob absolute top-[40%] -left-32 w-64 h-64 bg-brand-orange opacity-[0.07]" style={{ animationDelay: "-6s" }} />
      <div className="home-blob absolute bottom-[10%] right-[5%] w-48 h-48 bg-secondary-blue opacity-[0.05]" style={{ animationDelay: "-12s" }} />

      <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-16">
        {loading && (
          <div className="w-full flex items-center justify-center min-h-[40vh]">
            <Loader />
          </div>
        )}
        {error && (
          <p className="text-red-600 text-center py-12 font-plex">{error}</p>
        )}

        {!loading && !error && (
          <>
            {/* ─── Hero Section ───────────────────────── */}
            <section className="mb-16 card-animate-in">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
                {/* FFC Mark (gold) from Strapi: second logo = gold mark, else first logo */}
                {logo?.logo?.length ? (
                  <div className="shrink-0 flex items-center min-h-[4rem]">
                    <img
                      src={(() => {
                        const base = process.env.NEXT_PUBLIC_STRAPI_URL || "";
                        const item = logo.logo[1] ?? logo.logo[0];
                        const path = item?.url ?? "";
                        return path.startsWith("http") ? path : `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
                      })()}
                      alt="FFC Mark"
                      className="h-16 md:h-20 w-auto object-contain max-w-[180px]"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <h1 className="text-3xl md:text-4xl font-semibold text-brand-blue font-didot mb-3">
                    {userName ? `Welcome back, ${userName}!` : "Welcome to Feedforward!"}
                  </h1>
                  <p className="text-lg md:text-xl text-subtitle leading-relaxed max-w-xl font-plex mb-6">
                    Here is your Feedforward content portal. Feel free to share.
                  </p>
                  {hero?.description && !/lorem\s+ipsum/i.test(hero.description.trim()) && (
                    <p className="text-base md:text-lg text-subtitle leading-relaxed max-w-xl font-plex mb-6">
                      {hero.description}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ─── Gradient Divider ───────────────────── */}
            <div className="gradient-divider mb-14" />

            {/* ─── Row 1: Content (Meeting readoutss, Podcasts, additional content) ───────────────────── */}
            {contentTiles.length > 0 && (
              <>
                <section id="content-section" className="mb-14">
                  <header className="mb-6">
                    <h2 className="flex items-center gap-3 text-2xl font-bold mb-2 font-didot text-brand-blue">
                      <span className="inline-block w-8 h-1 rounded-full bg-brand-orange" />
                      Content Hub
                    </h2>
                    <p className="text-sm text-subtitle font-plex">
                      Meeting readouts, podcasts, and additional content to support your work.
                    </p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {contentTiles.map((tile, idx) => renderTileCard(tile, idx, "bg-brand-blue"))}
                  </div>
                </section>
                <div className="gradient-divider mb-14" />
              </>
            )}

            {/* ─── Row 2: Tools (Vendor Access, LibreChat) ──────────────────────── */}
            {toolTiles.length > 0 && (
              <>
                <section id="tools-section" className="mb-14">
                  <header className="mb-6">
                    <h2 className="flex items-center gap-3 text-2xl font-bold mb-2 font-didot text-brand-blue">
                      <span className="inline-block w-8 h-1 rounded-full bg-brand-orange" />
                      Tools
                    </h2>
                    <p className="text-sm text-subtitle font-plex">
                      Internal utilities and helpers to navigate and use your Feedforward content faster.
                    </p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {toolTiles.map((tile, idx) => renderTileCard(tile, idx, "bg-brand-blue"))}
                  </div>
                </section>
                <div className="gradient-divider mb-14" />
              </>
            )}

            {/* ─── Row 3: Experts ───────────────────── */}
            {expertTiles.length > 0 && (
              <section id="experts-section" className="mb-14">
                <header className="mb-6">
                  <h2 className="flex items-center gap-3 text-2xl font-bold mb-2 font-didot text-brand-blue">
                    <span className="inline-block w-8 h-1 rounded-full bg-brand-orange" />
                    Experts
                  </h2>
                  <p className="text-sm text-subtitle font-plex">
                    Connect with experts and access the expert network.
                  </p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {expertTiles.map((tile, idx) => renderTileCard(tile, idx, "bg-brand-blue"))}
                </div>
              </section>
            )}

            {tiles.length === 0 && (
              <p className="text-secondary text-center py-16 font-plex">
                No tiles available at the moment.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="home-bg min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
