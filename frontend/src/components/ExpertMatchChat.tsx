"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ExpertBio } from "@/../lib/types";
import { expertAdvisoryTopicsByName } from "@/../lib/expertAdvisoryTopics";
import { FaPaperPlane, FaUser, FaCalendarCheck } from "react-icons/fa";

/** Common English stopwords + chat fillers so short queries keep signal. */
const STOPWORDS = new Set(
  [
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "day", "get",
    "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "who", "boy", "did", "let", "put",
    "say", "she", "too", "use", "any", "ask", "way", "why", "try", "lot", "own", "ive", "ill", "youre",
    "im", "dont", "wont", "cant", "isnt", "arent", "doesnt", "didnt", "thats", "whats", "with", "from", "this",
    "that", "have", "been", "were", "what", "when", "your", "will", "just", "like", "into", "than", "then", "them",
    "some", "very", "also", "here", "come", "made", "make", "over", "such", "only", "about", "would", "could",
    "should", "there", "their", "want", "need", "help", "tell", "give", "know", "think", "look", "find", "work",
    "more", "much", "well", "back", "after", "first", "being", "other", "many", "most", "through", "where", "which",
    "while", "these", "those", "doing", "going", "really", "thing", "things", "please", "thanks", "thank",
  ].map((w) => w.toLowerCase())
);

const CHITCHAT = new Set([
  "hi", "hello", "hey", "yo", "sup", "thanks", "thx", "ty", "cheers", "bye", "goodbye", "ok", "okay", "k", "yes",
  "no", "yeah", "yep", "nah", "nope", "sure", "morning", "afternoon", "evening", "helloo", "hiya", "howdy",
]);

const CLARIFY_SUBSTANCE_MESSAGE =
  "Happy to help. Could you share a bit more about what you're trying to do or decide? For example, your team's AI adoption goals, a technical area, or a leadership challenge. That way I can suggest the right expert.";

const CLARIFY_LOW_CONFIDENCE_MESSAGE =
  "I don't have a strong enough match from that alone. Adding a sentence on your context (industry, team size, or the specific problem) will help me point you to the best expert.";

const WEIGHT_TOPIC = 2;
const WEIGHT_TITLE = 1.5;
const WEIGHT_BIO = 1;
const WEIGHT_NAME_EXACT = 0.35;
/** At least this best score (after weights) to show named recommendations. */
const MIN_MATCH_SCORE = 1.0;
const PARTIAL_MIN_LEN = 4;
const PARTIAL_WEIGHT_RATIO = 0.45;

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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function queryTokensFromUserMessage(userMessage: string): string[] {
  return tokenize(userMessage).filter((t) => !STOPWORDS.has(t));
}

function isSubstantiveQuery(tokens: string[], rawTrimmed: string): boolean {
  if (rawTrimmed.length < 8) return false;
  if (tokens.length === 0) return false;
  if (tokens.every((t) => CHITCHAT.has(t))) return false;
  if (tokens.length === 1) {
    const t = tokens[0];
    if (CHITCHAT.has(t)) return false;
    if (t.length < 5) return false;
  }
  return true;
}

function bestTokenWeightInSet(queryToken: string, corpusTokens: string[], weight: number): number {
  if (corpusTokens.length === 0) return 0;
  const set = new Set(corpusTokens);
  if (set.has(queryToken)) return weight;
  let best = 0;
  const partialW = weight * PARTIAL_WEIGHT_RATIO;
  for (const s of corpusTokens) {
    if (queryToken.length < PARTIAL_MIN_LEN || s.length < PARTIAL_MIN_LEN) continue;
    if (s.includes(queryToken) || queryToken.includes(s)) {
      best = Math.max(best, partialW);
    }
  }
  return best;
}

function getExpertCorpusTokens(bio: ExpertBio): {
  topicTokens: string[];
  titleTokens: string[];
  bioTokens: string[];
  nameTokens: string[];
} {
  const titleTokens = tokenize(bio.title);
  const bioTokens = tokenize(stripMarkdown(bio.bio));
  const topicChunks: string[] = [];
  if (bio.advisory_topics?.trim()) topicChunks.push(stripMarkdown(bio.advisory_topics));
  const fallback = expertAdvisoryTopicsByName[bio.name];
  if (fallback) {
    fallback.forEach((t) => {
      topicChunks.push(t.title);
      t.points.forEach((p) => topicChunks.push(stripMarkdown(p)));
    });
  }
  const topicTokens = tokenize(topicChunks.join(" "));
  const nameTokens = tokenize(bio.name);
  return { topicTokens, titleTokens, bioTokens, nameTokens };
}

function scoreExpertMatch(bio: ExpertBio, queryTokens: string[]): number {
  const { topicTokens, titleTokens, bioTokens, nameTokens } = getExpertCorpusTokens(bio);
  let score = 0;
  for (const q of queryTokens) {
    const fromTopics = bestTokenWeightInSet(q, topicTokens, WEIGHT_TOPIC);
    const fromTitle = bestTokenWeightInSet(q, titleTokens, WEIGHT_TITLE);
    const fromBio = bestTokenWeightInSet(q, bioTokens, WEIGHT_BIO);
    score += Math.max(fromTopics, fromTitle, fromBio);
    if (nameTokens.includes(q)) score += WEIGHT_NAME_EXACT;
  }
  return score;
}

type MatchResult = { experts: ExpertBio[]; bestScore: number };

function matchExperts(experts: ExpertBio[], queryTokens: string[], maxResults: number = 3): MatchResult {
  if (queryTokens.length === 0) return { experts: [], bestScore: 0 };

  const scored = experts.map((expert) => ({
    expert,
    score: scoreExpertMatch(expert, queryTokens),
  }));
  scored.sort((a, b) => b.score - a.score);
  const bestScore = scored[0]?.score ?? 0;
  if (bestScore < MIN_MATCH_SCORE) return { experts: [], bestScore };

  const top = scored.filter((x) => x.score >= MIN_MATCH_SCORE).slice(0, maxResults);
  return {
    experts: top.map((x) => x.expert),
    bestScore,
  };
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
  /** Optional controlled open state from parent. */
  open?: boolean;
  /** Optional open-state callback for parent coordination. */
  onOpenChange?: (open: boolean) => void;
}

export default function ExpertMatchChat({
  experts,
  getExpertSlug,
  bookSessionHref,
  embedInCard = false,
  open,
  onOpenChange,
}: ExpertMatchChatProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: INTRO_MESSAGE }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const isOpen = open ?? internalOpen;

  const setOpenState = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading || experts.length === 0) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    setTimeout(() => {
      const qTokens = queryTokensFromUserMessage(trimmed);
      let reply: string;
      let recommended: ExpertBio[] | undefined;

      if (!isSubstantiveQuery(qTokens, trimmed)) {
        reply = CLARIFY_SUBSTANCE_MESSAGE;
      } else {
        const { experts: matched, bestScore } = matchExperts(experts, qTokens);
        recommended = matched.length > 0 ? matched : undefined;
        const names = matched.map((e) => e.name);

        if (matched.length === 0) {
          reply =
            bestScore > 0
              ? CLARIFY_LOW_CONFIDENCE_MESSAGE
              : "I couldn't match that to a specific focus area yet. Try adding a bit more detail, or browse the profiles below—any of our experts can help with AI strategy and adoption.";
        } else if (matched.length === 1) {
          reply = `Based on what you shared, I'd recommend **${names[0]}**. Their focus areas align well with your goals. Check out their profile and book a session if it's a fit.`;
        } else {
          reply = `Based on what you shared, I'd recommend connecting with **${names.slice(0, -1).join("** or **")}** or **${names[names.length - 1]}**. Each has relevant experience—browse their profiles below to choose.`;
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply, experts: recommended }]);
      setLoading(false);
    }, 600);
  };

  const outerClass = embedInCard
    ? "mt-4 space-y-2"
    : "max-w-6xl mx-auto px-6 mb-12 space-y-3";

  if (experts.length === 0) {
    const emptyInner = bookSessionHref ? (
      <div className="flex max-w-xl flex-col gap-2">
        <a
          href={bookSessionHref}
          target="_blank"
          rel="noopener noreferrer"
          className="expert-book-cta inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-center text-base font-medium font-plex tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-1 sm:w-auto sm:self-start"
        >
          <FaCalendarCheck size={14} className="shrink-0 opacity-95" />
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
      <div className="flex max-w-xl flex-col gap-4">
        {bookSessionHref ? (
          <a
            href={bookSessionHref}
            target="_blank"
            rel="noopener noreferrer"
            className="expert-book-cta inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-center text-base font-medium font-plex tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-1 sm:w-auto sm:self-start"
          >
            <FaCalendarCheck size={14} className="shrink-0 opacity-95" />
            Book an Expert Session
          </a>
        ) : null}
      </div>

      {isOpen && (
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
