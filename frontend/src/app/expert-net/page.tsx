// app/expert-net/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getExpertNet } from "../../../lib/api";
import { ExpertNet, ExpertBio } from "../../../lib/types";
import { slugFromName } from "../../../lib/expertAdvisoryTopics";
import Loader from "../../components/Loader";
import BackToHome from "../../components/BackToHome";
import ExpertMatchChat from "../../components/ExpertMatchChat";
import { FaUser, FaArrowRight, FaCalendarCheck, FaChevronDown, FaChevronUp } from "react-icons/fa";

const EXPERT_NET_FAQ: { category: string; q: string; a: string }[] = [
  // Participation & Attendance
  { category: "Participation & Attendance", q: "What counts as an expert session?", a: "Expert sessions are company-specific advisory and consultation sessions, not speaking engagements. Many experts in our network also do speaking engagements at different rates. If you're interested in a speaking engagement, Feedforward can facilitate." },
  { category: "Participation & Attendance", q: "Who can we invite to expert sessions?", a: "Anyone from your organization can attend, including non-members and cross-functional partners. If you want colleagues to book their own sessions using your credits, contact Maddie." },
  { category: "Participation & Attendance", q: "Can we use expert sessions for talks with clients or customers?", a: "No, expert sessions are for internal use only." },
  { category: "Participation & Attendance", q: "How many people can attend?", a: "There's no hard limit, but please be reasonable. Keep it under 20 people for a real conversation." },
  { category: "Participation & Attendance", q: "Can multiple experts join one session?", a: "Yes, but each expert costs the same number of credits." },
  // Planning & Logistics
  { category: "Planning & Logistics", q: "How long is the typical session?", a: "60 minutes." },
  { category: "Planning & Logistics", q: "What formats are available?", a: "Fireside chats, informal conversations, or mini research talks followed by Q&A. Contact Maddie if you have something specific in mind." },
  { category: "Planning & Logistics", q: "Are sessions in-person or virtual?", a: "Virtual only." },
  { category: "Planning & Logistics", q: "How do I book an expert session?", a: "Contact Maddie or Gina to book." },
  { category: "Planning & Logistics", q: "What preparation is required?", a: "You must complete the intake form before your session. If the form isn't completed, your session will be rescheduled." },
  { category: "Planning & Logistics", q: "Can I do a prep call with the expert?", a: "Experts don't do prep calls. (Do you really want another meeting?!). Instead, we ask members to complete an intake form to provide context. If a prep call is essential, contact Maddie." },
  { category: "Planning & Logistics", q: "Can I record the session?", a: "Not usually. In limited cases, we may allow recording for internal use. Ask Maddie in advance." },
  { category: "Planning & Logistics", q: "Can experts sign an NDA before our session?", a: "Yes. Your Feedforward agreement covers confidentiality, but experts can sign additional NDAs upon request. Please coordinate through Maddie." },
  { category: "Planning & Logistics", q: "What if I need to cancel or reschedule?", a: "Please notify Maddie and the expert as soon as possible. If an expert needs to reschedule due to unforeseen circumstances, we'll let you know." },
  { category: "Planning & Logistics", q: "What video platform can we use (Zoom, Teams, etc.)?", a: "Your choice—Zoom, Teams, whatever you use. We default to Zoom unless you tell us otherwise." },
  // Content & Follow-up
  { category: "Content & Follow-up", q: "Can I hire an expert for an extended consulting engagement with my company?", a: "Yes, we'll connect you." },
  { category: "Content & Follow-up", q: "Can I ask follow-up questions after the session?", a: "Yes! Our experts are very active on Discord. That's the place to ask follow-up questions. Many members also book additional sessions with the same expert." },
  { category: "Content & Follow-up", q: "Will I receive any materials after the session?", a: "Sessions are conversations, not presentations, so there are no handouts. We recommend taking notes, and experts are reachable on Discord for follow-ups." },
];

function expertSlug(bio: ExpertBio): string {
  return (bio.slug && bio.slug.trim()) ? bio.slug.trim() : slugFromName(bio.name);
}

const ExpertNetPage = () => {
  const [expertNet, setExpertNet] = useState<ExpertNet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);

  const toggleFaq = useCallback((id: number) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
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
      <div className="min-h-screen bg-gray-50">
        {/* ─── Header (main-page style: title + elegant orange line) ─── */}
        <section className="max-w-6xl mx-auto px-6 pt-8 pb-2 card-animate-in">
          <BackToHome label="Member Portal" />
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold text-brand-blue font-didot">
                Founding team & Expert Advisory Network
              </h1>
              <p className="text-base text-subtitle font-plex mt-2 w-full">
                Access world-class expertise through 60-minute virtual sessions with leading minds in AI, strategy, and organizational transformation.
              </p>
              <p className="text-base text-subtitle font-plex mt-2 mb-6">
                If you have any questions, please email{" "}
                <a
                  href="mailto:maddie@feedforward.ai"
                  className="text-subtitle hover:underline underline-offset-2"
                >
                  maddie@feedforward.ai
                </a>
                .
              </p>
            </div>
            <a
              href="#faq"
              onClick={scrollToFaq}
              className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-blue border border-brand-blue rounded-lg hover:bg-brand-blue hover:text-white transition-colors font-plex"
            >
              <FaChevronDown size={12} />
              See FAQ
            </a>
          </div>
          <div className="gradient-divider mb-14" />
        </section>

        {/* ─── AI match chat: "Not sure who to book?" ─────────── */}
        {bios.length > 0 && (
          <ExpertMatchChat experts={bios} getExpertSlug={expertSlug} />
        )}

        {/* ─── Card Grid ────────────────────────────────────── */}
        {bios.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {bios.map((bio: ExpertBio, idx: number) => {
                const excerpt = plainText(bio.bio);
                const slug = expertSlug(bio);

                return (
                  <div
                    key={bio.id}
                    className="expert-card card-animate-in group block relative"
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

                    {/* Round avatar – upper left */}
                    <div
                      style={{
                        position: "absolute",
                        top: "0.5rem",
                        left: "0.5rem",
                        zIndex: 30,
                        pointerEvents: "auto",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget.querySelector("[data-avatar]") as HTMLElement;
                        if (el) el.style.animation = "avatarSpin 0.6s ease forwards";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget.querySelector("[data-avatar]") as HTMLElement;
                        if (el) el.style.animation = "none";
                      }}
                    >
                      {bio.photo ? (
                        <img
                          data-avatar
                          src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${bio.photo.url}`}
                          alt={bio.name}
                          style={{
                            width: "2.5rem",
                            height: "2.5rem",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #e9a059",
                            outline: "2px solid rgba(255,255,255,0.8)",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          data-avatar
                          style={{
                            width: "2.5rem",
                            height: "2.5rem",
                            borderRadius: "50%",
                            border: "2px solid #e9a059",
                            outline: "2px solid rgba(255,255,255,0.8)",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#536c89",
                          }}
                        >
                          <FaUser style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }} />
                        </div>
                      )}
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

                    <Link
                      href={`/expert-net/${slug}#book-session`}
                      className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 rounded-lg bg-brand-orange px-2 py-1.5 text-[10px] font-semibold text-white font-plex hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FaCalendarCheck size={10} /> Book session
                    </Link>
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
          <div className="space-y-6">
            {(() => {
              let lastCategory = "";
              let faqIndex = 0;
              return EXPERT_NET_FAQ.map((item) => {
                const showCategory = item.category !== lastCategory;
                if (showCategory) lastCategory = item.category;
                const id = faqIndex++;
                const expanded = expandedFaqId === id;
                return (
                  <div key={id}>
                    {showCategory && (
                      <h3 className="text-sm font-semibold text-subtitle font-plex uppercase tracking-wide mb-3 first:mt-0 mt-6">
                        {item.category}
                      </h3>
                    )}
                    <div className="rounded-xl bg-white border border-card shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleFaq(id)}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/80 transition-colors"
                        aria-expanded={expanded}
                      >
                        <span className="flex-1 text-base font-medium text-brand-blue font-plex">
                          {item.q}
                        </span>
                        <span className="text-subtitle shrink-0">
                          {expanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                        </span>
                      </button>
                      {expanded && (
                        <div className="border-t border-card px-5 py-4 bg-gray-50/50">
                          <p className="text-sm text-subtitle font-plex leading-relaxed">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>

        {/* Footer metadata */}
        <div className="max-w-6xl mx-auto px-6 pb-12">
          <div className="border-t border-gray-200 pt-6 text-sm text-subtitle font-plex">
            Last Updated:{" "}
            {new Date(expertNet.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </>
  );
};

export default ExpertNetPage;
