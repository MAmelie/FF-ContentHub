// app/expert-net/page.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { getExpertNet } from "../../../lib/api";
import { ExpertNet, ExpertBio } from "../../../lib/types";
import { slugFromName } from "../../../lib/expertAdvisoryTopics";
import Loader from "../../components/Loader";
import BackToHome from "../../components/BackToHome";
import ExpertMatchChat from "../../components/ExpertMatchChat";
import { EXPERT_SESSION_CALENDLY_URL } from "@/lib/expertSessionCalendly";
import {
  EXPERT_NET_FALLBACK_FAQ,
  EXPERT_NET_FALLBACK_FAQ_ALWAYS_VISIBLE_CATEGORY,
  EXPERT_NET_FALLBACK_FAQ_HEADING,
} from "../../../lib/expertNetFaqFallback";
import { FaUser, FaArrowRight, FaChevronDown, FaChevronUp } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Shown when Expert-Net title is empty in Strapi. */
const EXPERT_NET_FALLBACK_TITLE = "Expert Advisory Network";

/** Shown when Expert-Net description is empty in Strapi (markdown, same as Strapi editor). */
const EXPERT_NET_FALLBACK_DESCRIPTION = `Feedforward expert sessions are company-specific advisory conversations with members of our expert network, conducted virtually throughout the year. They are not speaking engagements.

Use this page to browse our experts' backgrounds and book a session directly. Not sure who to book with? [Ask our AI guide for a recommendation](#expert-ai-guide) based on your goals.

For more on expert sessions and how credits work, see the [FAQs](#faq) below. For speaking engagements, [contact us](mailto:maddie@feedforward.ai).`;

const EXPERT_NET_INTRO_CLASS = "mt-3 max-w-none";

const EXPERT_NET_INTRO_HTML_CLASS =
  "mt-3 max-w-none space-y-2 text-base leading-relaxed text-subtitle font-plex [text-wrap:pretty] [&_p+_p]:mt-2 [&_a]:font-medium [&_a]:text-subtitle [&_a]:underline [&_a]:decoration-brand-orange/60 [&_a]:underline-offset-2 hover:[&_a]:text-brand-orange focus:[&_a]:outline-none focus-visible:[&_a]:ring-2 focus-visible:[&_a]:ring-brand-orange/35 focus-visible:[&_a]:ring-offset-2 [&_a]:rounded-sm";

const EXPERT_NET_INTRO_LINK_CLASS =
  "font-medium text-subtitle underline decoration-brand-orange/60 underline-offset-2 hover:text-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 focus-visible:ring-offset-2 rounded-sm";

function isLikelyHtml(content: string): boolean {
  return /<\s*(p|a|div|br|h[1-6]|ul|ol|li|strong|em)\b/i.test(content);
}

/** Maps intro link hrefs from Strapi (anchor or full URL) to in-page actions. */
function expertNetIntroLinkAction(
  href: string | null
): "ai-guide" | "faq" | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (trimmed === "#expert-ai-guide" || trimmed.endsWith("#expert-ai-guide")) {
    return "ai-guide";
  }
  if (trimmed === "#faq" || trimmed.endsWith("#faq")) {
    return "faq";
  }
  return null;
}

function ExpertNetIntro({
  content,
  onOpenAiGuide,
  onScrollToFaq,
}: {
  content: string;
  onOpenAiGuide: () => void;
  onScrollToFaq: () => void;
}) {
  const handleHtmlClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a[href]");
    if (!anchor || !e.currentTarget.contains(anchor)) return;
    const action = expertNetIntroLinkAction(anchor.getAttribute("href"));
    if (action === "ai-guide") {
      e.preventDefault();
      onOpenAiGuide();
    } else if (action === "faq") {
      e.preventDefault();
      onScrollToFaq();
    }
  };

  if (isLikelyHtml(content)) {
    return (
      <div
        className={EXPERT_NET_INTRO_HTML_CLASS}
        dangerouslySetInnerHTML={{ __html: content }}
        onClick={handleHtmlClick}
      />
    );
  }

  return (
    <div className={EXPERT_NET_INTRO_CLASS}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-base leading-relaxed text-subtitle font-plex [text-wrap:pretty] [&:not(:first-child)]:mt-2">
              {children}
            </p>
          ),
          a: ({ href, children }) => {
            const action = expertNetIntroLinkAction(href ?? null);
            if (action === "ai-guide") {
              return (
                <a
                  href={href}
                  className={EXPERT_NET_INTRO_LINK_CLASS}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenAiGuide();
                  }}
                >
                  {children}
                </a>
              );
            }
            if (action === "faq") {
              return (
                <a
                  href={href}
                  className={EXPERT_NET_INTRO_LINK_CLASS}
                  onClick={(e) => {
                    e.preventDefault();
                    onScrollToFaq();
                  }}
                >
                  {children}
                </a>
              );
            }
            return (
              <a href={href} className={EXPERT_NET_INTRO_LINK_CLASS}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

type FaqItem = { q: string; a: string };

function faqRowsForExpertNet(
  expertNet: ExpertNet
): { category: string; q: string; a: string }[] {
  if (expertNet.faq_items && expertNet.faq_items.length > 0) {
    return expertNet.faq_items.map((item) => ({
      category: item.category,
      q: item.question,
      a: item.answer,
    }));
  }
  return EXPERT_NET_FALLBACK_FAQ.map((item) => ({
    category: item.category,
    q: item.q,
    a: item.a,
  }));
}

const FAQ_CONTACT_EMAILS: Record<string, string> = {
  Maddie: "maddie@feedforward.ai",
  Gina: "gina@feedforward.ai",
};

function groupFaqByCategory(
  items: { category: string; q: string; a: string }[]
): { category: string; items: FaqItem[] }[] {
  const map = new Map<string, FaqItem[]>();
  const order: string[] = [];
  for (const row of items) {
    if (!map.has(row.category)) {
      order.push(row.category);
      map.set(row.category, []);
    }
    map.get(row.category)!.push({ q: row.q, a: row.a });
  }
  return order.map((category) => ({
    category,
    items: map.get(category)!,
  }));
}

/** Stable id fragment for FAQ category (no spaces/special chars in HTML ids). */
function faqCategoryBaseId(category: string): string {
  return `faq-cat-${category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function expertSlug(bio: ExpertBio): string {
  return (bio.slug && bio.slug.trim()) ? bio.slug.trim() : slugFromName(bio.name);
}

function renderFaqAnswer(answer: string): React.ReactNode {
  const parts = answer.split(/(Maddie|Gina)/g);
  return parts.map((part, idx) => {
    const email = FAQ_CONTACT_EMAILS[part];
    if (!email) return <React.Fragment key={idx}>{part}</React.Fragment>;
    return (
      <a
        key={idx}
        href={`mailto:${email}`}
        className="underline decoration-brand-orange/60 underline-offset-2 hover:text-brand-blue"
      >
        {part}
      </a>
    );
  });
}

const ExpertNetPage = () => {
  const [expertNet, setExpertNet] = useState<ExpertNet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAiGuideOpen, setIsAiGuideOpen] = useState(false);
  const [openFaqCategories, setOpenFaqCategories] = useState<Set<string>>(
    () => new Set()
  );
  const [showScrollTop, setShowScrollTop] = useState(false);
  /** Distance from viewport bottom (px); lifts the FAB above `#site-footer` when it’s in view. */
  const [scrollTopFabBottomPx, setScrollTopFabBottomPx] = useState(24);

  const faqByCategory = useMemo(
    () => (expertNet ? groupFaqByCategory(faqRowsForExpertNet(expertNet)) : []),
    [expertNet]
  );

  const faqHeading =
    expertNet?.faq_heading?.trim() || EXPERT_NET_FALLBACK_FAQ_HEADING;
  const faqAlwaysVisibleCategory =
    expertNet?.faq_always_visible_category?.trim() ||
    EXPERT_NET_FALLBACK_FAQ_ALWAYS_VISIBLE_CATEGORY;

  const toggleFaqCategory = useCallback((category: string) => {
    setOpenFaqCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const scrollToFaqSection = useCallback(() => {
    document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const openAiGuideSection = useCallback(() => {
    setIsAiGuideOpen(true);
    document
      .getElementById("expert-ai-guide")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const scrollToFaq = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      scrollToFaqSection();
    },
    [scrollToFaqSection]
  );

  const openAiGuide = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      openAiGuideSection();
    },
    [openAiGuideSection]
  );

  useEffect(() => {
    const fetchExpertNet = async () => {
      try {
        const data = await getExpertNet();
        if (data && data.publishedAt) {
          setExpertNet(data);
        } else {
          setError("Expert-Net content is not yet published");
        }
      } catch (err) {
        console.error("Error fetching expert net:", err);
        setError("Failed to load expert net content");
      } finally {
        setLoading(false);
      }
    };
    fetchExpertNet();
  }, []);

  useEffect(() => {
    if (loading || error || !expertNet) {
      setShowScrollTop(false);
      return;
    }
    const BOTTOM_THRESHOLD_PX = 200;
    const GAP_ABOVE_FOOTER_PX = 16;

    const update = () => {
      const root = document.documentElement;
      const maxScroll = root.scrollHeight - window.innerHeight;
      const defaultBottom = window.innerWidth >= 768 ? 32 : 24;

      if (maxScroll <= 0) {
        setShowScrollTop(false);
      } else {
        setShowScrollTop(window.scrollY >= maxScroll - BOTTOM_THRESHOLD_PX);
      }

      const footer = document.getElementById("site-footer");
      const h = window.innerHeight;
      // Continuous in footerTop: avoids a jump when the footer crosses into the viewport
      // (previously we only lifted when footerTop < h, so the FAB sat on the footer until then).
      const bottom =
        footer != null
          ? Math.max(defaultBottom, h - footer.getBoundingClientRect().top + GAP_ABOVE_FOOTER_PX)
          : defaultBottom;
      setScrollTopFabBottomPx(bottom);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [loading, error, expertNet]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /** Strip markdown to plain text for preview excerpts */
  const plainText = (md: string) =>
    md
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*{1,3}(.*?)\*{1,3}/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`~>|]/g, "")
      .replace(/\n{2,}/g, " ")
      .replace(/\n/g, " ")
      .trim();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  if (!expertNet)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">No expert net content found</p>
      </div>
    );

  const bios = expertNet.expert_bios ?? [];
  const pageTitle = expertNet.title?.trim() || EXPERT_NET_FALLBACK_TITLE;
  const introContent =
    expertNet.description?.trim() || EXPERT_NET_FALLBACK_DESCRIPTION;

  return (
    <>
      {showScrollTop ? (
        <button
          type="button"
          onClick={scrollToTop}
          style={{ bottom: scrollTopFabBottomPx }}
          className="fixed right-6 z-50 flex size-11 items-center justify-center rounded-full border border-card bg-white text-brand-orange shadow-md transition-colors hover:bg-gray-50 hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 focus-visible:ring-offset-2 md:right-8"
          aria-label="Back to top"
        >
          <FaChevronUp className="size-4" aria-hidden />
        </button>
      ) : null}
      <div className="min-h-screen">
        {/* ─── Header (main-page style: title + elegant orange line) ─── */}
        <section className="max-w-6xl mx-auto px-6 pt-8 pb-2 card-animate-in">
          <BackToHome label="Member Portal" />
          <div className="mt-4 rounded-2xl border border-card bg-white p-6 shadow-sm md:p-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-brand-blue font-didot">
              {pageTitle}
            </h1>
            <ExpertNetIntro
              content={introContent}
              onOpenAiGuide={openAiGuideSection}
              onScrollToFaq={scrollToFaqSection}
            />
            <div id="expert-ai-guide">
              <ExpertMatchChat
                experts={bios}
                getExpertSlug={expertSlug}
                bookSessionHref={EXPERT_SESSION_CALENDLY_URL}
                embedInCard
                open={isAiGuideOpen}
                onOpenChange={setIsAiGuideOpen}
              />
            </div>
          </div>
          <a
            href="#faq"
            onClick={scrollToFaq}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary font-plex underline-offset-4 transition-colors hover:text-brand-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 focus-visible:ring-offset-2 rounded-sm"
          >
            <FaChevronDown size={10} className="shrink-0 opacity-80" aria-hidden />
            FAQs &amp; details
          </a>
          <div className="mt-6 mb-8 gradient-divider" />
        </section>

        {/* ─── Card Grid ────────────────────────────────────── */}
        {bios.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
              {bios.map((bio: ExpertBio, idx: number) => {
                const excerpt = plainText(bio.bio);
                const slug = expertSlug(bio);

                return (
                  <div
                    key={bio.id}
                    className="expert-card card-animate-in group block relative w-full max-w-[280px]"
                    style={
                      { "--delay": `${idx * 100}ms` } as React.CSSProperties
                    }
                  >
                  <Link
                    href={`/expert-net/${slug}`}
                    className="absolute inset-0 z-10"
                    aria-label={`View ${bio.name} profile`}
                  />
                    {/* Photo */}
                    {bio.photo ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${bio.photo.url}`}
                        alt={bio.name}
                        className="expert-card__img"
                      />
                    ) : (
                      <div className="expert-card__img bg-secondary-blue flex items-center justify-center">
                        <FaUser className="text-white/30 text-6xl" />
                      </div>
                    )}

                    {/* Gradient scrim */}
                    <div className="expert-card__scrim" />

                    {/* Logo – upper left (static asset so it always shows in production) */}
                    <div
                      style={{
                        position: "absolute",
                        top: "0.5rem",
                        left: "0.5rem",
                        zIndex: 30,
                        pointerEvents: "none",
                      }}
                    >
                      <img
                        src="/logo.png"
                        alt=""
                        role="presentation"
                        style={{
                          height: "1.5rem",
                          width: "auto",
                          maxWidth: "2.5rem",
                          objectFit: "contain",
                          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))",
                          display: "block",
                        }}
                      />
                    </div>

                    {/* Content overlay */}
                    <div className="expert-card__content text-white">
                      {/* Always-visible: name + title */}
                      <h3 className="text-base font-bold font-didot leading-snug">
                        {bio.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-brand-orange font-medium font-plex">
                        {bio.title}
                      </p>

                      {/* Revealed on hover */}
                      <div className="expert-card__detail">
                        <div className="mt-2 h-px w-8 bg-brand-orange/60" />

                        <p className="mt-2 text-xs text-white/75 leading-relaxed font-plex line-clamp-3">
                          {excerpt.slice(0, 140)}
                          {excerpt.length > 140 ? "..." : ""}
                        </p>

                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-orange tracking-wide uppercase font-plex">
                          View Profile <FaArrowRight size={8} />
                        </span>
                      </div>
                    </div>

                    {/*
                    <Link
                      href={`/expert-net/${slug}#book-session`}
                      className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 rounded-lg bg-brand-orange px-2 py-1.5 text-[10px] font-semibold text-white font-plex hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FaCalendarCheck size={10} /> Book session
                    </Link>
                    */}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section id="faq" className="max-w-6xl mx-auto px-6 pb-16 md:pb-20 scroll-mt-6" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-xl md:text-2xl font-semibold text-brand-blue font-didot mb-6">
            {faqHeading}
          </h2>
          <div className="space-y-4">
            {faqByCategory.map(({ category, items }) => {
              const baseId = faqCategoryBaseId(category);
              const headingId = `${baseId}-heading`;
              const panelId = `${baseId}-panel`;
              const expanded = openFaqCategories.has(category);
              const alwaysVisible = category === faqAlwaysVisibleCategory;

              const qaList = (
                <div className="space-y-5">
                  {items.map((item, idx) => (
                    <div key={`${category}-${idx}`}>
                      <h3 className="text-sm font-medium text-brand-blue font-plex leading-snug">
                        {item.q}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-subtitle font-plex">
                        {renderFaqAnswer(item.a)}
                      </p>
                    </div>
                  ))}
                </div>
              );

              if (alwaysVisible) {
                return (
                  <div
                    key={category}
                    className="rounded-xl border border-card bg-white shadow-sm overflow-hidden"
                  >
                    <div className="border-b border-card px-5 py-4">
                      <span
                        id={headingId}
                        className="text-base font-semibold text-brand-blue font-plex"
                      >
                        {category}
                      </span>
                    </div>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={headingId}
                      className="bg-gray-50/50 px-5 py-5"
                    >
                      {qaList}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={category}
                  className="rounded-xl border border-card bg-white shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    id={headingId}
                    onClick={() => toggleFaqCategory(category)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 focus-visible:ring-inset"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                  >
                    <span className="flex-1 text-base font-semibold text-brand-blue font-plex">
                      {category}
                    </span>
                    <span className="shrink-0 text-subtitle" aria-hidden>
                      {expanded ? (
                        <FaChevronUp size={14} />
                      ) : (
                        <FaChevronDown size={14} />
                      )}
                    </span>
                  </button>
                  {expanded ? (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={headingId}
                      className="border-t border-card bg-gray-50/50 px-5 py-5"
                    >
                      {qaList}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
};

export default ExpertNetPage;
