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
import { FaUser, FaArrowRight, FaChevronDown, FaChevronUp } from "react-icons/fa";

const EXPERT_NET_FAQ: { category: string; q: string; a: string }[] = [
  // Participation & Attendance
  { category: "Participation & Attendance", q: "What counts as an expert session?", a: "Expert sessions are company-specific advisory and consultation sessions, not speaking engagements. Many experts in our network also do speaking engagements at different rates. If you're interested in a speaking engagement, Feedforward can facilitate." },
  { category: "Participation & Attendance", q: "Who can we invite to expert sessions?", a: "Anyone from your organization can attend, including non-members and cross-functional partners. Use the Book an Expert Session button on this page to choose a time. If you want colleagues to book their own sessions using your credits or need help with roster logistics, contact Maddie." },
  { category: "Participation & Attendance", q: "Can we use expert sessions for talks with clients or customers?", a: "No, expert sessions are for internal use only." },
  { category: "Participation & Attendance", q: "How many people can attend?", a: "There's no hard limit, but please be reasonable. Keep it under 20 people for a real conversation." },
  { category: "Participation & Attendance", q: "Can multiple experts join one session?", a: "Yes, but each expert costs the same number of credits." },
  // Planning & Logistics
  { category: "Planning & Logistics", q: "How long is the typical session?", a: "60 minutes." },
  { category: "Planning & Logistics", q: "What formats are available?", a: "Fireside chats, informal conversations, or mini research talks followed by Q&A. For something outside the usual formats, contact Maddie." },
  { category: "Planning & Logistics", q: "Are sessions in-person or virtual?", a: "Virtual only." },
  { category: "Planning & Logistics", q: "How do I book an expert session?", a: "Start with the Book an Expert Session button on this page. It opens our scheduling flow so you can pick a time. For credits, billing, non-standard formats, or if you want us to help match you to an expert, contact Maddie or Gina." },
  { category: "Planning & Logistics", q: "What preparation is required?", a: "Complete the steps in the scheduling flow and any intake or context questions you're asked before the session. If prep isn't completed, we may need to reschedule. If you're unsure what's required, ask Maddie or Gina." },
  { category: "Planning & Logistics", q: "Can I do a prep call with the expert?", a: "Experts don't do prep calls. (Do you really want another meeting?!). Instead, use the scheduling and intake steps to share context. If a prep call is essential, contact Maddie." },
  { category: "Planning & Logistics", q: "Can I record the session?", a: "Not usually. In limited cases, we may allow recording for internal use. Ask Maddie in advance." },
  { category: "Planning & Logistics", q: "Can experts sign an NDA before our session?", a: "Yes. Your Feedforward agreement covers confidentiality, but experts can sign additional NDAs upon request. Please coordinate through Maddie." },
  { category: "Planning & Logistics", q: "What if I need to cancel or reschedule?", a: "Use the confirmation and links from your scheduling email when possible, and notify Maddie and the expert as soon as you can. If an expert needs to reschedule due to unforeseen circumstances, we'll let you know." },
  { category: "Planning & Logistics", q: "What video platform can we use (Zoom, Teams, etc.)?", a: "Your choice—Zoom, Teams, whatever you use. We default to Zoom unless you tell us otherwise." },
  // Content & Follow-up
  { category: "Content & Follow-up", q: "Can I hire an expert for an extended consulting engagement with my company?", a: "Yes, we'll connect you." },
  { category: "Content & Follow-up", q: "Can I ask follow-up questions after the session?", a: "Yes! Our experts are very active on Discord. That's the place to ask follow-up questions. Many members also book additional sessions with the same expert." },
  { category: "Content & Follow-up", q: "Will I receive any materials after the session?", a: "Sessions are conversations, not presentations, so there are no handouts. We recommend taking notes, and experts are reachable on Discord for follow-ups." },
];

type FaqItem = { q: string; a: string };

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

const ExpertNetPage = () => {
  const [expertNet, setExpertNet] = useState<ExpertNet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFaqCategories, setOpenFaqCategories] = useState<Set<string>>(
    () => new Set()
  );
  const [showScrollTop, setShowScrollTop] = useState(false);
  /** Distance from viewport bottom (px); lifts the FAB above `#site-footer` when it’s in view. */
  const [scrollTopFabBottomPx, setScrollTopFabBottomPx] = useState(24);

  const faqByCategory = useMemo(
    () => groupFaqByCategory(EXPERT_NET_FAQ),
    []
  );

  const toggleFaqCategory = useCallback((category: string) => {
    setOpenFaqCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const scrollToFaq = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
              Expert Advisory Network
            </h1>
            <div className="mt-3 max-w-none space-y-2 text-base leading-relaxed text-subtitle font-plex [text-wrap:pretty]">
              <p>
                Expert sessions are company-specific advisory and consultation sessions, not speaking engagements. Many experts in our network also do speaking engagements at different rates.
              </p>
              <p>
                If you&apos;re interested in a speaking engagement, Feedforward can facilitate.
              </p>
            </div>
            <ExpertMatchChat
              experts={bios}
              getExpertSlug={expertSlug}
              bookSessionHref={EXPERT_SESSION_CALENDLY_URL}
              embedInCard
            />
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
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqByCategory.map(({ category, items }) => {
              const baseId = faqCategoryBaseId(category);
              const headingId = `${baseId}-heading`;
              const panelId = `${baseId}-panel`;
              const expanded = openFaqCategories.has(category);
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
                      <div className="space-y-5">
                        {items.map((item, idx) => (
                          <div key={`${category}-${idx}`}>
                            <h3 className="text-sm font-medium text-brand-blue font-plex leading-snug">
                              {item.q}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-subtitle font-plex">
                              {item.a}
                            </p>
                          </div>
                        ))}
                      </div>
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
