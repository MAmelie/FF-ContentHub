// src/components/Navbar.tsx
"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { FaSignOutAlt, FaChevronDown, FaBars, FaTimes } from "react-icons/fa";
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
const CONTENT_TILE_ORDER = ["Meeting readouts", "Podcasts", "Additional content"];

const Navbar = () => {
  const [logo, setLogo] = useState<Logo | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [contentHubOpen, setContentHubOpen] = useState(false);
  const [expertNetOpen, setExpertNetOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileContentOpen, setMobileContentOpen] = useState(false);
  const [mobileExpertOpen, setMobileExpertOpen] = useState(false);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [expertBios, setExpertBios] = useState<ExpertBio[]>([]);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

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
        setMobileMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContentHubOpen(false);
        setExpertNetOpen(false);
        setMobileMenuOpen(false);
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
  const isForYouActive = pathname === "/home";
  const isExpertNetActive = pathname === "/expert-net" || pathname.startsWith("/expert-net/");
  const isAboutActive = pathname === "/about";

  return (
    <div
      ref={navRef}
      className="w-full sticky top-0 py-4 md:py-7 lg:py-9 z-50"
      style={{ background: "linear-gradient(135deg, #1a3f69 0%, #2a5a8f 50%, #1a3f69 100%)" }}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 md:hidden">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
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
              className="h-9 w-auto shrink-0"
              onError={() => setLogoLoadFailed(true)}
            />
            <h1 className="min-w-0 truncate font-semibold text-lg text-white font-didot tracking-tight">
              Member Portal
            </h1>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            {authenticated && user ? (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 bg-brand-orange hover:bg-amber-500 text-white px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-200"
                title="Logout"
              >
                <FaSignOutAlt size={11} />
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="bg-brand-orange hover:bg-amber-500 text-white px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-200"
              >
                Log in
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <FaTimes size={15} /> : <FaBars size={15} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-3 rounded-xl bg-white/95 backdrop-blur border border-white/30 shadow-lg p-3 space-y-2">
            {authenticated && user && (
              <p className="px-2 pb-1 text-sm text-brand-blue font-medium font-plex">
                Hi, {getDisplayName(user)}
              </p>
            )}
            <Link
              href="/home"
              className={`block rounded-md px-3 py-2 text-sm font-plex ${
                isForYouActive ? "text-brand-orange bg-peach/30" : "text-brand-blue hover:bg-peach/30"
              }`}
            >
              For You
            </Link>
            <Link
              href="/about"
              className={`block rounded-md px-3 py-2 text-sm font-plex ${
                isAboutActive ? "text-brand-orange bg-peach/30" : "text-brand-blue hover:bg-peach/30"
              }`}
            >
              About Us
            </Link>
            <button
              type="button"
              onClick={() => setMobileContentOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between rounded-md px-3 py-2 text-sm text-brand-blue hover:bg-peach/30 font-plex"
            >
              Content and Tools Hub
              <FaChevronDown className={`w-3 h-3 transition-transform ${mobileContentOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileContentOpen && (
              <div className="pl-3">
                <Link href="/" className="block py-1.5 text-sm text-brand-blue font-medium font-plex">
                  Content and Tools Hub Home
                </Link>
                {contentTiles.map((tile) => {
                  const href = getTileHref(tile);
                  const isExternal = href.startsWith("http");
                  return isExternal ? (
                    <a key={tile.id} href={href} target="_blank" rel="noopener noreferrer" className="block py-1.5 text-sm text-brand-blue font-plex">
                      {tile.title}
                    </a>
                  ) : (
                    <Link key={tile.id} href={href} className="block py-1.5 text-sm text-brand-blue font-plex">
                      {tile.title}
                    </Link>
                  );
                })}
                {toolTiles.map((tile) => {
                  const href = getTileHref(tile);
                  const isExternal = href.startsWith("http");
                  return isExternal ? (
                    <a key={tile.id} href={href} target="_blank" rel="noopener noreferrer" className="block py-1.5 text-sm text-brand-blue font-plex">
                      {tile.title}
                    </a>
                  ) : (
                    <Link key={tile.id} href={href} className="block py-1.5 text-sm text-brand-blue font-plex">
                      {tile.title}
                    </Link>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileExpertOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between rounded-md px-3 py-2 text-sm text-brand-blue hover:bg-peach/30 font-plex"
            >
              Expert Network
              <FaChevronDown className={`w-3 h-3 transition-transform ${mobileExpertOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileExpertOpen && (
              <div className="pl-3">
                <Link href="/expert-net" className="block py-1.5 text-sm text-brand-blue font-medium font-plex">
                  All Experts
                </Link>
                {expertBios.map((bio) => {
                  const slug = expertSlug(bio);
                  return (
                    <Link
                      key={bio.id}
                      href={`/expert-net/${slug}`}
                      className="block py-1.5 text-sm text-brand-blue font-plex"
                    >
                      {bio.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="hidden md:flex justify-between items-center">
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
                className="h-12 sm:h-14 w-auto"
                onError={() => setLogoLoadFailed(true)}
              />
              <h1 className="font-semibold text-2xl sm:text-3xl text-white font-didot tracking-tight">
                Member Portal
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-4 lg:gap-5">
            <Link
              href="/home"
              className={`relative inline-flex items-center text-base lg:text-[17px] font-plex transition-colors duration-200 pb-0.5 ${
                isForYouActive ? "text-brand-orange" : "text-white hover:text-brand-orange"
              }`}
            >
              For You
              {isForYouActive && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-brand-orange" />
              )}
            </Link>
            <Link
              href="/about"
              className={`relative inline-flex items-center text-base lg:text-[17px] font-plex transition-colors duration-200 pb-0.5 ${
                isAboutActive ? "text-brand-orange" : "text-white hover:text-brand-orange"
              }`}
            >
              About Us
              {isAboutActive && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-brand-orange" />
              )}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setContentHubOpen((v) => !v);
                  setExpertNetOpen(false);
                }}
                aria-expanded={contentHubOpen}
                aria-haspopup="true"
                className={`relative inline-flex items-center gap-1 text-base lg:text-[17px] font-plex transition-colors duration-200 pb-0.5 ${
                  isContentHubActive ? "text-brand-orange" : "text-white hover:text-brand-orange"
                }`}
              >
                Content and Tools Hub
                <FaChevronDown className={`w-4 h-4 transition-transform ${contentHubOpen ? "rotate-180" : ""}`} />
                {isContentHubActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-brand-orange" />
                )}
              </button>
              {contentHubOpen && (
                <div className="absolute top-full left-0 mt-2 min-w-[280px] rounded-lg bg-white shadow-xl border border-gray-100 py-3 z-[60]">
                  <Link
                    href="/"
                    onClick={() => setContentHubOpen(false)}
                    className="block px-4 py-2.5 text-lg font-medium text-brand-blue hover:bg-peach/30 font-plex border-b border-gray-100"
                  >
                    Content and Tools Hub
                  </Link>
                  <div className="border-b border-gray-100 pb-3 mb-3">
                    {contentTiles.length === 0 ? (
                      <p className="px-4 py-2 text-lg text-gray-400">None</p>
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
                            className="block px-4 py-2.5 text-lg text-brand-blue hover:bg-peach/30 font-plex"
                          >
                            {tile.title}
                          </a>
                        ) : (
                          <Link
                            key={tile.id}
                            href={href}
                            onClick={() => setContentHubOpen(false)}
                            className="block px-4 py-2.5 text-lg text-brand-blue hover:bg-peach/30 font-plex"
                          >
                            {tile.title}
                          </Link>
                        );
                      })
                    )}
                  </div>
                  <div className="pb-1">
                    {toolTiles.length === 0 ? (
                      <p className="px-4 py-2 text-lg text-gray-400">None</p>
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
                            className="block px-4 py-2.5 text-lg text-brand-blue hover:bg-peach/30 font-plex"
                          >
                            {tile.title}
                          </a>
                        ) : (
                          <Link
                            key={tile.id}
                            href={href}
                            onClick={() => setContentHubOpen(false)}
                            className="block px-4 py-2.5 text-lg text-brand-blue hover:bg-peach/30 font-plex"
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

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setExpertNetOpen((v) => !v);
                  setContentHubOpen(false);
                }}
                aria-expanded={expertNetOpen}
                aria-haspopup="true"
                className={`relative inline-flex items-center gap-1 text-base lg:text-[17px] font-plex transition-colors duration-200 pb-0.5 ${
                  isExpertNetActive ? "text-brand-orange" : "text-white hover:text-brand-orange"
                }`}
              >
                Expert Network
                <FaChevronDown className={`w-4 h-4 transition-transform ${expertNetOpen ? "rotate-180" : ""}`} />
                {isExpertNetActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-brand-orange" />
                )}
              </button>
              {expertNetOpen && (
                <div className="absolute top-full left-0 mt-2 min-w-[280px] max-h-[70vh] overflow-y-auto rounded-lg bg-white shadow-xl border border-gray-100 py-3 z-[60]">
                  <Link
                    href="/expert-net"
                    onClick={() => setExpertNetOpen(false)}
                    className="block px-4 py-2.5 text-lg font-medium text-brand-blue hover:bg-peach/30 font-plex border-b border-gray-100"
                  >
                    All Experts
                  </Link>
                  {expertBios.length === 0 ? (
                    <p className="px-4 py-2.5 text-lg text-gray-400">No experts</p>
                  ) : (
                    expertBios.map((bio) => {
                      const slug = expertSlug(bio);
                      return (
                        <Link
                          key={bio.id}
                          href={`/expert-net/${slug}`}
                          onClick={() => setExpertNetOpen(false)}
                          className="block px-4 py-2.5 text-lg text-brand-blue hover:bg-peach/30 font-plex"
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
                <span className="text-white/70 text-lg font-plex">
                  Hi, {getDisplayName(user)}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 bg-brand-orange hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
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
                className="bg-brand-orange hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </nav>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
};

export default Navbar;
