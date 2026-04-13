"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ExpertBio } from "@/../lib/types";
import { expertAdvisoryTopicsByName } from "@/../lib/expertAdvisoryTopics";
import { FaCommentDots, FaChevronDown, FaChevronUp, FaPaperPlane, FaUser, FaCalendarCheck } from "react-icons/fa";

function stripMarkdown(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/#{1,6}\s+/g, " ")
    .replace(/\*{1,3}(.*?)\*{1,3}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`~>|]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSearchableTextForExpert(bio: ExpertBio): string {
  const parts: string[] = [
    bio.name.toLowerCase(),
    bio.title.toLowerCase(),
    stripMarkdown(bio.bio),
  ];
  if (bio.advisory_topics?.trim()) {
    parts.push(stripMarkdown(bio.advisory_topics));
  }
  const fallback = expertAdvisoryTopicsByName[bio.name];
  if (fallback) {
    fallback.forEach((t) => {
      parts.push(t.title.toLowerCase());
      t.points.forEach((p) => parts.push(stripMarkdown(p)));
    });
  }
  return parts.join(" ");
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function recommendExperts(
  experts: ExpertBio[],
  userMessage: string,
  maxResults: number = 3
): ExpertBio[] {
  const queryTokens = tokenize(userMessage);
  if (queryTokens.length === 0) return experts.slice(0, maxResults);

  const scored = experts.map((expert) => {
    const searchable = getSearchableTextForExpert(expert);
    const searchTokens = new Set(tokenize(searchable));
    let score = 0;
    for (const t of queryTokens) {
      if (searchTokens.has(t)) score += 1;
      else if (Array.from(searchTokens).some((s) => s.includes(t) || t.includes(s))) score += 0.5;
    }
    return { expert, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((x) => x.score > 0);
  if (top.length === 0) return experts.slice(0, maxResults);
  return top.slice(0, maxResults).map((x) => x.expert);
}

export type ChatMessage = { role: "user" | "assistant"; content: string; experts?: ExpertBio[] };

const INTRO_MESSAGE =
  "Hi! I'm here to help match you with the right expert. What challenges are you facing or what would you like to accomplish with an expert advisory session?";

interface ExpertMatchChatProps {
  experts: ExpertBio[];
  getExpertSlug: (bio: ExpertBio) => string;
  /** When set, shows “Book an expert session” beside the match helper (e.g. Calendly URL). */
  bookSessionHref?: string;
  /** Omit outer section spacing when rendered inside a parent card (e.g. expert-net hero). */
  embedInCard?: boolean;
}

export default function ExpertMatchChat({
  experts,
  getExpertSlug,
  bookSessionHref,
  embedInCard = false,
}: ExpertMatchChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: INTRO_MESSAGE }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading || experts.length === 0) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    setTimeout(() => {
      const recommended = recommendExperts(experts, trimmed);
      const names = recommended.map((e) => e.name);
      let reply: string;
      if (recommended.length === 0) {
        reply = "I couldn't match your question to a specific focus area, but all our experts can help with AI and expertise. Browse the profiles below and book a session with anyone who resonates with you.";
      } else if (recommended.length === 1) {
        reply = `Based on what you shared, I'd recommend **${names[0]}**. Their focus areas align well with your goals. Check out their profile and book a session if it's a fit.`;
      } else {
        reply = `Based on what you shared, I'd recommend connecting with **${names.slice(0, -1).join("** or **")}** or **${names[names.length - 1]}**. Each has relevant experience—browse their profiles below to choose.`;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, experts: recommended.length > 0 ? recommended : undefined },
      ]);
      setLoading(false);
    }, 600);
  };

  const outerClass = embedInCard
    ? "mt-4 space-y-2"
    : "max-w-6xl mx-auto px-6 mb-12 space-y-3";

  if (experts.length === 0) {
    const emptyInner = bookSessionHref ? (
      <div className="flex max-w-xl flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtitle font-plex">
          Get started
        </p>
        <a
          href={bookSessionHref}
          target="_blank"
          rel="noopener noreferrer"
          className="expert-book-cta inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-center text-sm font-medium font-plex tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-1 sm:w-auto sm:self-start"
        >
          <FaCalendarCheck size={12} className="shrink-0 opacity-95" />
          Book an Expert Session
        </a>
        <p className="text-sm leading-relaxed text-subtitle font-plex">
          Expert profiles aren&apos;t listed here right now. You can still book using the button above. For help choosing someone or special requests, contact Maddie or Gina, or scroll to the FAQ below.
        </p>
      </div>
    ) : null;

    if (embedInCard) {
      return (
        <div className={outerClass} aria-label="Book an expert session">
          {emptyInner}
        </div>
      );
    }
    return (
      <section className={outerClass} aria-label="Book an expert session">
        {emptyInner}
      </section>
    );
  }

  const matchBody = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-subtitle font-plex">
        Get started
      </p>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-3">
        {bookSessionHref ? (
          <a
            href={bookSessionHref}
            target="_blank"
            rel="noopener noreferrer"
            className="expert-book-cta inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium font-plex tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-1 text-center"
          >
            <FaCalendarCheck size={12} className="shrink-0 opacity-95" />
            Book an Expert Session
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="group flex flex-1 min-w-0 items-center gap-2 rounded-md border border-card bg-white px-2 py-2 font-plex shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 focus-visible:ring-offset-1"
          aria-expanded={open}
        >
          <span className="flex w-8 shrink-0 items-center justify-start">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-orange/15 text-brand-orange-strong">
              <FaCommentDots size={16} />
            </span>
          </span>
          <span className="min-w-0 flex-1 text-center text-sm font-medium leading-snug text-brand-orange-strong group-hover:text-[#965a20]">
            Want us to recommend an Expert Session?
          </span>
          <span className="flex w-8 shrink-0 items-center justify-end text-brand-orange-strong group-hover:text-[#965a20]">
            {open ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
          </span>
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 max-h-[420px] flex flex-col bg-gray-50/50">
              <div className="flex-1 overflow-y-auto space-y-4 min-h-[200px] pr-2">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-brand-blue text-white font-plex text-sm"
                          : "bg-white border border-gray-200 text-primary font-plex text-sm shadow-sm"
                      }`}
                    >
                      {msg.role === "assistant" && msg.content.includes("**") ? (
                        <span
                          className="whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: msg.content.replace(
                              /\*\*([^*]+)\*\*/g,
                              "<strong class='font-semibold'>$1</strong>"
                            ),
                          }}
                        />
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                      {msg.experts && msg.experts.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
                          {msg.experts.map((expert) => (
                            <Link
                              key={String(expert.id)}
                              href={`/expert-net/${getExpertSlug(expert)}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-3 py-2 text-sm font-medium text-brand-blue hover:bg-brand-orange/10 hover:border-brand-orange/60 transition-colors"
                            >
                              <FaUser className="text-brand-orange shrink-0" size={12} />
                              {expert.name} – {expert.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-subtitle font-plex">
                      <span className="inline-flex gap-1">
                        <span className="animate-pulse">Finding</span>
                        <span className="animate-pulse">a match</span>
                        <span className="animate-pulse">...</span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="mt-4 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="e.g. How do I get my team to adopt AI?"
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-plex text-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange"
                  aria-label="Describe your challenge or goal"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-orange px-4 py-3 text-white font-medium text-sm font-plex hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  aria-label="Send"
                >
                  <FaPaperPlane size={16} />
                </button>
              </div>
            </div>
        </div>
      )}
    </>
  );

  if (embedInCard) {
    return <div className={outerClass}>{matchBody}</div>;
  }
  return <section className={outerClass}>{matchBody}</section>;
}
