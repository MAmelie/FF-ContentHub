"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getLogo } from "../../../lib/api";
import { Logo } from "../../../lib/types";
import { isAuthenticated, getUser, getDisplayName } from "../../../lib/auth";
import Loader from "@/components/Loader";

/**
 * Personalized home (post-login).
 * UX: Clean Feedforward branding, minimal copy, clear hierarchy. Recommendation
 * cards use a subtle gradient thumb and "View" affordance; primary CTA is a
 * dedicated block so "Go to member portal" reads as the main next step.
 */

/** Hardcoded recommendation item; shape is API-ready for later. */
interface RecommendationItem {
  id: string;
  source: "discord" | "memberSessions" | "podcasts";
  text: string;
  /** Optional: render this phrase inside text as an external link. */
  linkInText?: { phrase: string; href: string };
}

const DISCORD_LINK_WRITING =
  "https://discord.com/channels/1254761492608188517/1254761493610758298/1483149245052616755";
const DISCORD_LINK_SIMULATED =
  "https://discord.com/channels/1254761492608188517/1267576905125593272/1482238814951833813";
const DISCORD_LINK_GEN_AI_PHILOSOPHY =
  "https://discord.com/channels/1254761492608188517/1267576905125593272/1481451707220099143";
const DISCORD_LINK_ETHAN_TAKE =
  "https://discord.com/channels/1254761492608188517/1254761493610758298/1483529961007747183";
const MEMBER_SESSION_RECRUITING_READOUT =
  "https://strapi-be-production-5b58.up.railway.app/uploads/Readout_Feedforward_Member_Session_Recruiting_to_Power_AI_Transformation_3_17_2026_docx_1_1_6d4c8076c9.pdf";
const PODCAST_TITLE_MAPPING_FUTURE = "Mapping the Future: Tim O'Reilly on AI and Innovation";
const PODCAST_LINK_MAPPING_FUTURE =
  `/podcasts#episode-title-${encodeURIComponent(PODCAST_TITLE_MAPPING_FUTURE)}`;

const RECOMMENDED_ITEMS: RecommendationItem[] = [
  {
    id: "rec-1",
    source: "discord",
    text: "How fast are writing capabilities improving - are they matching the exponential rates of improvement for coding, tool use, etc.?",
    linkInText: { phrase: "writing capabilities", href: DISCORD_LINK_WRITING },
  },
  {
    id: "rec-2",
    source: "discord",
    text: "A simulated organization for understanding human vs agent behavior in real-world scenarios.",
    linkInText: { phrase: "simulated organization", href: DISCORD_LINK_SIMULATED },
  },
  {
    id: "rec-3",
    source: "memberSessions",
    text: "Guidance for hiring in the AI-era, including how to surface core traits like agency, learning velocity and first principles thinking.",
    linkInText: {
      phrase: "Guidance for hiring in the AI-era",
      href: MEMBER_SESSION_RECRUITING_READOUT,
    },
  },
  {
    id: "rec-4",
    source: "podcasts",
    text: PODCAST_TITLE_MAPPING_FUTURE,
    linkInText: {
      phrase: PODCAST_TITLE_MAPPING_FUTURE,
      href: PODCAST_LINK_MAPPING_FUTURE,
    },
  },
];

const PREVIOUS_ITEMS: RecommendationItem[] = [
  {
    id: "prev-1",
    source: "discord",
    text: "Read how one member now includes their Gen AI philosophy as a pillar of operational excellence in their annual report.",
    linkInText: { phrase: "Gen AI philosophy", href: DISCORD_LINK_GEN_AI_PHILOSOPHY },
  },
  {
    id: "prev-2",
    source: "discord",
    text: "Check out Ethan's take on which tool excels: ChatGPT, Claude or Microsoft Agent.",
    linkInText: { phrase: "Ethan's take", href: DISCORD_LINK_ETHAN_TAKE },
  },
];

const FALLBACK_LOGO = "/logo.png";

export default function HomePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/auth/login");
      return;
    }
    setAuthChecked(true);
    const user = getUser();
    if (user) {
      setUserName(getDisplayName(user));
    }

    // Logo commented out for now.
    // const fetchLogo = async () => {
    //   try {
    //     const logoData = await getLogo();
    //     setLogo(logoData ?? null);
    //     setLogoLoadFailed(false);
    //   } catch {
    //     setLogoLoadFailed(true);
    //   }
    // };
    // fetchLogo();
  }, [router]);

  const handleRecommendationClick = (_item: RecommendationItem) => {
    // Placeholder: items are interactive but routing is disabled for now.
  };

  const renderItemText = (item: RecommendationItem) => {
    if (!item.linkInText || !item.text.includes(item.linkInText.phrase)) {
      return item.text;
    }
    const [before, after] = item.text.split(item.linkInText.phrase);
    const isInternalLink = item.linkInText.href.startsWith("/");
    return (
      <>
        {before}
        {isInternalLink ? (
          <Link
            href={item.linkInText.href}
            className="text-brand-blue font-medium underline decoration-brand-blue/50 hover:decoration-brand-blue"
            onClick={(e) => e.stopPropagation()}
          >
            {item.linkInText.phrase}
          </Link>
        ) : (
          <a
            href={item.linkInText.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue font-medium underline decoration-brand-blue/50 hover:decoration-brand-blue"
            onClick={(e) => e.stopPropagation()}
          >
            {item.linkInText.phrase}
          </a>
        )}
        {after}
      </>
    );
  };

  if (!authChecked) {
    return (
      <div className="home-bg min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="home-bg min-h-screen relative overflow-hidden">
      <div className="home-blob absolute -top-24 -right-24 w-80 h-80 bg-peach opacity-20" />
      <div
        className="home-blob absolute top-[40%] -left-32 w-64 h-64 bg-brand-orange opacity-[0.07]"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="home-blob absolute bottom-[10%] right-[5%] w-48 h-48 bg-secondary-blue opacity-[0.05]"
        style={{ animationDelay: "-12s" }}
      />

      <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-16">
        {/* ─── Personalized header ───────────────────────── */}
        <section className="mb-8 card-animate-in">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            {/* Logo commented out for now.
            {logo?.logo?.length && !logoLoadFailed && process.env.NEXT_PUBLIC_STRAPI_URL ? (
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
                  onError={() => setLogoLoadFailed(true)}
                />
              </div>
            ) : (
              <div className="shrink-0 flex items-center min-h-[4rem]">
                <img
                  src={FALLBACK_LOGO}
                  alt="FF Content Hub"
                  className="h-16 md:h-20 w-auto object-contain max-w-[180px]"
                />
              </div>
            )}
            */}
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-semibold text-brand-blue font-didot mb-2">
                {userName ? `Welcome back, ${userName}` : "Welcome back"}
              </h1>
              <p className="text-base md:text-lg text-subtitle leading-relaxed max-w-xl font-plex">
                Your home base for Feedforward content. A few picks to get you started—or go straight to the{" "}
                <Link href="/" className="text-brand-blue font-small decoration-brand-blue/50 hover:decoration-brand-blue transition-colors">
                  full portal
                </Link>{" "}
                below.
              </p>
            </div>
          </div>
        </section>

        <div className="gradient-divider mb-8" />

        {/* ─── Latest for you ───────────────────────────── */}
        <section id="latest-for-you" className="mb-16">
          <header className="mb-8">
            <h2 className="flex items-center gap-3 text-2xl font-bold mb-1 font-didot text-brand-blue">
              <span className="inline-block w-8 h-1 rounded-full bg-brand-orange" />
              New and relevant for you
            </h2>
            <p className="text-sm text-subtitle font-plex">
              Check out our recommendations.
            </p>
          </header>
          <div className="space-y-3">
            {RECOMMENDED_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleRecommendationClick(item)}
                className="w-full text-left rounded-xl border border-brand-blue/10 bg-white/70 hover:bg-white transition-colors px-4 py-3 shadow-sm"
                style={{ "--delay": `${idx * 60}ms` } as React.CSSProperties}
              >
                <p className="text-primary font-plex leading-relaxed">
                  <span>{idx + 1}.</span>{" "}
                  {renderItemText(item)}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ─── Previous ───────────────────────────── */}
        <section id="previous-for-you" className="mb-16">
          <header className="mb-8">
            <h2 className="flex items-center gap-3 text-2xl font-bold mb-1 font-didot text-brand-blue">
              <span className="inline-block w-8 h-1 rounded-full bg-brand-orange" />
              Previous
            </h2>
            <p className="text-sm text-subtitle font-plex">
              Earlier recommendations will appear here.
            </p>
          </header>
          <div className="space-y-3">
            {PREVIOUS_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleRecommendationClick(item)}
                className="w-full text-left rounded-xl border border-brand-blue/10 bg-white/70 hover:bg-white transition-colors px-4 py-3 shadow-sm"
                style={{ "--delay": `${idx * 60}ms` } as React.CSSProperties}
              >
                <p className="text-primary font-plex leading-relaxed">
                  <span>{idx + 1}.</span>{" "}
                  {renderItemText(item)}
                </p>
              </button>
            ))}
          </div>
        </section>

        <div className="gradient-divider mb-8" />

        {/* ─── Go to member portal CTA (entire block clickable) ───────────── */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="home-portal-cta block w-full rounded-2xl p-8 md:p-10 text-center cursor-pointer transition-[box-shadow,transform] duration-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
        >
          <h3 className="text-xl font-semibold font-didot text-white mb-2">
            Explore the full hub
          </h3>
          <p className="text-white/90 text-sm font-plex mb-6 max-w-md mx-auto">
            Browse all content, tools, and experts in one place.
          </p>
          <span className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-brand-blue bg-white font-medium shadow-sm pointer-events-none">
            Go to member portal
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
