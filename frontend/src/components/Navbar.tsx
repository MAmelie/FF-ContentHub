// src/components/Navbar.tsx
"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import { usePathname } from "next/navigation";
import { getLogo, getAllTiles, getExpertNet } from "../../lib/api";
import { Logo, Tile, ExpertBio } from "../../lib/types";
import { getUser, logout, isAuthenticated, getDisplayName } from "../../lib/auth";
import { slugFromName } from "../../lib/expertAdvisoryTopics";
import LoginModal from "./LoginModal";

function getTileHref(tile: Tile): string {
  if (tile.link_to_single_type) return `/${tile.slug.toLowerCase()}`;
  if (tile.link?.trim()) return tile.link.trim();
  return `/tiles/${tile.slug.toLowerCase()}`;
}

function expertSlug(bio: ExpertBio): string {
  return (bio.slug?.trim()) ? bio.slug.trim() : slugFromName(bio.name);
}

/** Fallback when Strapi logo is unavailable. Use public/logo.png. */
const FALLBACK_LOGO = "/logo.png";

const Navbar = () => {
  const [logo, setLogo] = useState<Logo | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [contentHubOpen, setContentHubOpen] = useState(false);
  const [expertNetOpen, setExpertNetOpen] = useState(false);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [expertBios, setExpertBios] = useState<ExpertBio[]>([]);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  const CONTENT_TILE_ORDER = ["Member sessions", "Podcasts", "Additional content"];

  const { toolTiles, contentTiles } = useMemo(() => {
    const tools = tiles.filter((t) => t.category === "tool");
    const dashboard = tiles.filter((t) => t.category === "dashboard");
    const contentOnly = tiles.filter((t) => t.category === "content");
    const content = [...dashboard, ...contentOnly].sort((a, b) => {
      const aIdx = CONTENT_TILE_ORDER.indexOf(a.title);
      const bIdx = CONTENT_TILE_ORDER.indexOf(b.title);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    return { toolTiles: tools, contentTiles: content };
  }, [tiles]);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const logoData = await getLogo();
        setLogo(logoData ?? null);
        setLogoLoadFailed(false);
      } catch (error) {
        console.error("Error fetching logo:", error);
      }
    };

    const checkAuth = () => {
      const authStatus = isAuthenticated();
      setAuthenticated(authStatus);
      if (authStatus) {
        setUser(getUser());
      }
    };

    fetchLogo();
    checkAuth();
  }, []);

  useEffect(() => {
    const loadNavData = async () => {
      try {
        const { tiles: tileData } = await getAllTiles("");
        setTiles(tileData ?? []);
      } catch (err) {
        console.error("Error fetching tiles for nav:", err);
      }
      try {
        const expertNet = await getExpertNet();
        setExpertBios(expertNet?.expert_bios ?? []);
      } catch (err) {
        console.error("Error fetching experts for nav:", err);
      }
    };
    loadNavData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setContentHubOpen(false);
        setExpertNetOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContentHubOpen(false);
        setExpertNetOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
  };

  const isContentHubActive = pathname === "/" || pathname.startsWith("/tiles/") || pathname === "/podcasts";
  const isExpertNetActive = pathname === "/expert-net" || pathname.startsWith("/expert-net/");

  return (
    <div
      ref={navRef}
      className="w-full sticky top-0 py-7 sm:py-9 z-50"
      style={{ background: "linear-gradient(135deg, #1a3f69 0%, #2a5a8f 50%, #1a3f69 100%)" }}
    >
      <nav className="max-w-6xl mx-auto flex justify-between items-center px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-4">
            <img
              src={
                !logoLoadFailed &&
                logo?.logo?.[0]?.url &&
                process.env.NEXT_PUBLIC_STRAPI_URL
                  ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${logo.logo[0].url}`
                  : FALLBACK_LOGO
              }
              alt=""
              role="presentation"
              className="h-14 sm:h-16 w-auto"
              onError={() => setLogoLoadFailed(true)}
            />
            <h1 className="font-semibold text-2xl sm:text-3xl text-white font-didot tracking-tight">
              Feedforward Member Portal
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Content Hub dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setContentHubOpen((v) => !v);
                setExpertNetOpen(false);
              }}
              aria-expanded={contentHubOpen}
              aria-haspopup="true"
              className={`relative inline-flex items-center gap-1 text-base font-plex transition-colors duration-200 pb-0.5 ${
                isContentHubActive ? "text-brand-orange" : "text-white hover:text-brand-orange"
              }`}
            >
              Content Hub
              <FaChevronDown className={`w-3.5 h-3.5 transition-transform ${contentHubOpen ? "rotate-180" : ""}`} />
              {isContentHubActive && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-brand-orange" />
              )}
            </button>
            {contentHubOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[220px] rounded-lg bg-white shadow-xl border border-gray-100 py-2 z-[60]">
                {/* Row 1: Content (Member sessions, Podcasts, additional content) */}
                <div className="border-b border-gray-100 pb-2 mb-2">
                  <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider font-plex">
                    Content
                  </p>
                  {contentTiles.length === 0 ? (
                    <p className="px-3 py-1 text-sm text-gray-400">None</p>
                  ) : (
                    contentTiles.map((tile) => {
                      const href = getTileHref(tile);
                      const isExternal = href.startsWith("http");
                      return isExternal ? (
                        <a
                          key={tile.id}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-2 text-sm text-brand-blue hover:bg-peach/30 font-plex"
                        >
                          {tile.title}
                        </a>
                      ) : (
                        <Link
                          key={tile.id}
                          href={href}
                          onClick={() => setContentHubOpen(false)}
                          className="block px-3 py-2 text-sm text-brand-blue hover:bg-peach/30 font-plex"
                        >
                          {tile.title}
                        </Link>
                      );
                    })
                  )}
                </div>
                {/* Row 2: Tools (Vendor Access, LibreChat) */}
                <div className="pb-2">
                  <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider font-plex">
                    Tools
                  </p>
                  {toolTiles.length === 0 ? (
                    <p className="px-3 py-1 text-sm text-gray-400">None</p>
                  ) : (
                    toolTiles.map((tile) => {
                      const href = getTileHref(tile);
                      const isExternal = href.startsWith("http");
                      return isExternal ? (
                        <a
                          key={tile.id}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-2 text-sm text-brand-blue hover:bg-peach/30 font-plex"
                        >
                          {tile.title}
                        </a>
                      ) : (
                        <Link
                          key={tile.id}
                          href={href}
                          onClick={() => setContentHubOpen(false)}
                          className="block px-3 py-2 text-sm text-brand-blue hover:bg-peach/30 font-plex"
                        >
                          {tile.title}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Expert Network dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setExpertNetOpen((v) => !v);
                setContentHubOpen(false);
              }}
              aria-expanded={expertNetOpen}
              aria-haspopup="true"
              className={`relative inline-flex items-center gap-1 text-base font-plex transition-colors duration-200 pb-0.5 ${
                isExpertNetActive ? "text-brand-orange" : "text-white hover:text-brand-orange"
              }`}
            >
              Expert Network
              <FaChevronDown className={`w-3.5 h-3.5 transition-transform ${expertNetOpen ? "rotate-180" : ""}`} />
              {isExpertNetActive && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-brand-orange" />
              )}
            </button>
            {expertNetOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[220px] max-h-[70vh] overflow-y-auto rounded-lg bg-white shadow-xl border border-gray-100 py-2 z-[60]">
                <Link
                  href="/expert-net"
                  onClick={() => setExpertNetOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-brand-blue hover:bg-peach/30 font-plex border-b border-gray-100"
                >
                  All Experts
                </Link>
                {expertBios.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-400">No experts</p>
                ) : (
                  expertBios.map((bio) => {
                    const slug = expertSlug(bio);
                    return (
                      <Link
                        key={bio.id}
                        href={`/expert-net/${slug}`}
                        onClick={() => setExpertNetOpen(false)}
                        className="block px-3 py-2 text-sm text-brand-blue hover:bg-peach/30 font-plex"
                      >
                        {bio.name}
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {authenticated && user ? (
            <>
              {/* <Link
                href="/users/appointments"
                className={`relative text-base font-plex transition-colors duration-200 pb-0.5 ${
                  pathname === "/users/appointments"
                    ? "text-brand-orange"
                    : "text-white hover:text-brand-orange"
                }`}
              >
                My appointments
                {pathname === "/users/appointments" && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-brand-orange" />
                )}
              </Link> */}
              <span className="text-white/70 text-base font-plex">
                Hi, {getDisplayName(user)}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-brand-orange hover:bg-amber-500 text-white px-3.5 py-2 rounded-lg text-base font-medium transition-colors duration-200"
                title="Logout"
              >
                <FaSignOutAlt size={13} />
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="bg-brand-orange hover:bg-amber-500 text-white px-3.5 py-2 rounded-lg text-base font-medium transition-colors duration-200"
            >
              Log in
            </button>
          )}
        </div>
      </nav>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
};

export default Navbar;
