// src/components/Footer.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getHomepageHero, getLogo } from "../../lib/api";
import { HomepageHero, Logo } from "../../lib/types";

/** Fallback when Strapi logo is unavailable. Use public/logo.png. */
const FALLBACK_LOGO = "/logo.png";

function getMediaUrl(media: unknown): string | null {
  if (!media || typeof media !== "object") return null;
  const m = media as Record<string, unknown>;
  const direct = typeof m.url === "string" ? m.url : null;
  if (direct) return direct;

  const attributes = m.attributes as Record<string, unknown> | undefined;
  if (attributes && typeof attributes.url === "string") return attributes.url;

  const data = m.data as Record<string, unknown> | undefined;
  const dataAttrs = data?.attributes as Record<string, unknown> | undefined;
  if (dataAttrs && typeof dataAttrs.url === "string") return dataAttrs.url;

  return null;
}

const Footer = () => {
  const [logo, setLogo] = useState<Logo | null>(null);
  const [hero, setHero] = useState<HomepageHero | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    const fetchFooterBranding = async () => {
      try {
        const [heroData, logoData] = await Promise.all([getHomepageHero(), getLogo()]);
        setHero(heroData ?? null);
        setLogo(logoData ?? null);
        setLogoLoadFailed(false);
      } catch (error) {
        console.error("Error fetching footer logo:", error);
      }
    };

    fetchFooterBranding();
  }, []);

  const heroCoverUrl = getMediaUrl(hero?.cover);
  const logoUrl = logo?.logo?.[0]?.url ?? null;

  return (
    <footer id="site-footer" className="w-full mt-auto">
      <div className="h-px bg-gradient-to-r from-transparent via-brand-orange to-transparent" />

      <div className="py-8" style={{ background: "var(--nav-footer-gradient)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <img
            src={
              !logoLoadFailed &&
              (heroCoverUrl || logoUrl) &&
              process.env.NEXT_PUBLIC_STRAPI_URL
                ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${heroCoverUrl || logoUrl}`
                : FALLBACK_LOGO
            }
            alt="Feedforward logo"
            className="h-8 w-auto"
            onError={() => setLogoLoadFailed(true)}
          />
          <p className="text-sm text-white/60 font-plex sm:text-right">&copy; 2026 Feedforward</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
