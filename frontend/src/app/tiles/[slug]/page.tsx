// app/tiles/[slug]/page.tsx
"use client";
import { useEffect, useState, use, useMemo } from "react";
import { getTileBySlug, getAllDocuments } from "../../../../lib/api";
import { useRouter } from "next/navigation";
import { Tile, ListItem, Doc, Document } from "@/../lib/types";
// Recommendation, type RecommendationCategory — commented out with recommendations/tabs
import { FaDownload, FaExternalLinkAlt, FaSearch, FaSortAmountDown, FaSortAmountUp } from "react-icons/fa";
import Loader from "@/components/Loader";
import BackToHome from "@/components/BackToHome";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MEMBER_SESSIONS_TILE_SLUG, MEMBER_SESSION_GROUPS } from "../member-sessions-config";
import {
  CANONICAL_MEMBER_SESSIONS,
  type CanonicalSectionSession,
} from "../../documents/canonical-member-sessions";

type TocEntry = { id: string; title: string; slug: string };

function getSessionTitleFromDoc(title: string): string {
  const afterReadout = title.match(/call\s*readout[_:\s]+(.+)$/i);
  if (afterReadout?.[1]) return afterReadout[1].trim();
  return title;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function docMatchesCanonical(docTitle: string, canonical: CanonicalSectionSession): boolean {
  const docSession = getSessionTitleFromDoc(docTitle);
  const a = normalizeForMatch(canonical.title);
  const b = normalizeForMatch(docSession);
  return b.includes(a) || a.includes(b);
}

function listItemMatchesCanonical(itemTitle: string, canonical: CanonicalSectionSession): boolean {
  const a = normalizeForMatch(canonical.title);
  const b = normalizeForMatch(itemTitle);
  return b.includes(a) || a.includes(b);
}

function isPdfDocument(doc: Document): boolean {
  const mime = (doc.file?.mime ?? doc.file?.mimeType ?? "").toString().toLowerCase();
  if (!mime) return false;
  if (mime.includes("audio") || mime.includes("mpeg") || mime.includes("mp3") || mime.includes("ogg") || mime.includes("wav")) return false;
  return mime.includes("pdf");
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function parseCanonicalDateToTimestamp(dateLabel: string): number | null {
  const normalized = dateLabel.replace(/^sept\b/i, "Sep");
  const ts = new Date(normalized).getTime();
  return Number.isFinite(ts) ? ts : null;
}

const TilePage = ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = use(params);
  const [tile, setTile] = useState<Tile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeSection, setActiveSection] = useState<string>("");
  // activeContentTab (recommendations/tabs) — commented out; only list items shown
  // const [activeContentTab, setActiveContentTab] = useState<string>("");
  const router = useRouter();

  const isMemberSessions = slug?.toLowerCase() === MEMBER_SESSIONS_TILE_SLUG;

  useEffect(() => {
    const fetchTile = async () => {
      if (slug) {
        try {
          const fetchedTile = await getTileBySlug(slug);
          setTile(fetchedTile);
        } catch (err) {
          // For member-sessions we always show the canonical list; tile is only for optional links
          if (slug?.toLowerCase() !== MEMBER_SESSIONS_TILE_SLUG) {
            setError("Error fetching tile.");
          }
          setTile(null);
          console.log(err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTile();
  }, [slug]);

  useEffect(() => {
    if (!isMemberSessions) return;
    const fetchDocuments = async () => {
      try {
        const data = await getAllDocuments();
        setDocuments(data.documents.filter(isPdfDocument));
      } catch {
        // Non-blocking; list still shows, just without PDF links
      }
    };
    fetchDocuments();
  }, [isMemberSessions]);

  const filteredAndSortedListItems = useMemo(() => {
    if (!tile?.list_items) return [];

    let filtered = tile.list_items;

    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // const sorted = [...filtered].sort((a, b) => {
    //   if (!a.date && !b.date) return 0;
    //   if (!a.date) return 1;
    //   if (!b.date) return -1;
    //   const dateA = new Date(a.date).getTime();
    //   const dateB = new Date(b.date).getTime();
    //   return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    // });
    // return sorted;
    return filtered;
  }, [tile?.list_items, searchQuery]);

  /** When member-sessions: map canonical session → Strapi document (for View/Download). */
  const canonicalToDocument = useMemo(() => {
    if (!isMemberSessions) return new Map<CanonicalSectionSession, Document | null>();
    const map = new Map<CanonicalSectionSession, Document | null>();
    const usedDocIds = new Set<string | number>();
    for (const session of CANONICAL_MEMBER_SESSIONS) {
      const matched = documents.find(
        (doc) => !usedDocIds.has(doc.id) && docMatchesCanonical(doc.title, session)
      );
      if (matched) {
        map.set(session, matched);
        usedDocIds.add(matched.id);
      } else {
        map.set(session, null);
      }
    }
    return map;
  }, [isMemberSessions, documents]);

  /** When member-sessions: map canonical session → list item (for link/attachment). */
  const canonicalToListItem = useMemo(() => {
    if (!isMemberSessions || !tile?.list_items) return new Map<CanonicalSectionSession, ListItem | null>();
    const map = new Map<CanonicalSectionSession, ListItem | null>();
    const usedItemIds = new Set<number>();
    for (const session of CANONICAL_MEMBER_SESSIONS) {
      const matched = tile.list_items.find(
        (item) => !usedItemIds.has(item.id) && listItemMatchesCanonical(item.title, session)
      );
      if (matched) {
        map.set(session, matched);
        usedItemIds.add(matched.id);
      } else {
        map.set(session, null);
      }
    }
    return map;
  }, [isMemberSessions, tile?.list_items]);

  /** Filter canonical sessions by search. */
  const filteredCanonicalSessions = useMemo(() => {
    if (!isMemberSessions) return [];
    if (!searchQuery.trim()) return CANONICAL_MEMBER_SESSIONS;
    const q = searchQuery.toLowerCase().trim();
    const groupMatches = (groupId: string, subGroupId?: string) => {
      const group = MEMBER_SESSION_GROUPS.find((g) => g.id === groupId);
      if (!group) return false;
      if (group.title.toLowerCase().includes(q)) return true;
      if (group.description?.toLowerCase().includes(q)) return true;
      if (subGroupId) {
        const sg = group.subGroups?.find((s) => s.id === subGroupId);
        if (sg?.title.toLowerCase().includes(q)) return true;
      }
      return false;
    };
    return CANONICAL_MEMBER_SESSIONS.filter(
      (s) => s.title.toLowerCase().includes(q) || groupMatches(s.groupId, s.subGroupId)
    );
  }, [isMemberSessions, searchQuery]);

  /** Group filtered canonical sessions by groupId / subGroupId. */
  const groupedCanonical = useMemo(() => {
    if (!isMemberSessions) return { byGroup: {} };
    const byGroup: Record<
      string,
      {
        subGroups?: Record<string, { title: string; sessions: CanonicalSectionSession[] }>;
        directSessions?: CanonicalSectionSession[];
      }
    > = {};
    for (const session of filteredCanonicalSessions) {
      const group = MEMBER_SESSION_GROUPS.find((g) => g.id === session.groupId);
      if (!group) continue;
      if (!byGroup[session.groupId]) {
        if (group.subGroups) {
          byGroup[session.groupId] = {
            subGroups: Object.fromEntries(
              group.subGroups.map((sg) => [sg.id, { title: sg.title, sessions: [] }])
            ),
          };
        } else {
          byGroup[session.groupId] = { directSessions: [] };
        }
      }
      const bucket = byGroup[session.groupId];
      if (session.subGroupId && bucket.subGroups?.[session.subGroupId]) {
        bucket.subGroups[session.subGroupId].sessions.push(session);
      } else if (bucket.directSessions) {
        bucket.directSessions.push(session);
      }
    }
    return { byGroup };
  }, [isMemberSessions, filteredCanonicalSessions]);

  const memberSessionsToc = useMemo(() => {
    if (!isMemberSessions) return [];
    return MEMBER_SESSION_GROUPS.filter((g) => {
      const b = groupedCanonical.byGroup[g.id];
      if (!b) return false;
      if (b.directSessions?.length) return true;
      if (b.subGroups) return Object.values(b.subGroups).some((sg) => sg.sessions.length > 0);
      return false;
    }).map((g) => ({ id: g.id, title: `${g.emoji} ${g.title}`, slug: g.id }));
  }, [isMemberSessions, groupedCanonical]);

  const memberSessionsCoverage = useMemo(() => {
    if (!isMemberSessions) return null;
    const timestamps = CANONICAL_MEMBER_SESSIONS
      .map((session) => parseCanonicalDateToTimestamp(session.date))
      .filter((ts): ts is number => ts !== null);
    if (timestamps.length === 0) return null;

    const earliest = new Date(Math.min(...timestamps));
    const latest = new Date(Math.max(...timestamps));
    const lastUpdated = formatMonthYear(latest);
    const dateRange =
      earliest.getFullYear() === latest.getFullYear() && earliest.getMonth() === latest.getMonth()
        ? formatMonthYear(earliest)
        : `${formatMonthYear(earliest)} – ${formatMonthYear(latest)}`;

    return { lastUpdated, dateRange };
  }, [isMemberSessions]);

  const tableOfContents = useMemo(() => {
    if (!tile?.docs) return [];
    return tile.docs
      .filter((doc: Doc) => doc.subtitle)
      .map((doc: Doc) => ({
        id: `doc-${doc.id}`,
        title: doc.subtitle!,
        slug: doc.subtitle!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }));
  }, [tile?.docs]);

  /* ——— Recommendations and tabs (commented out; client reverted to list items only) ———
  const RECOMMENDATION_CATEGORY_ORDER: RecommendationCategory[] = [
    "What to read",
    "What to watch",
    "What to listen to",
    "Who to follow",
  ];
  const recommendationsByCategory = useMemo(() => {
    if (!tile?.recommendations?.length) return [];
    const groups = new Map<RecommendationCategory, Recommendation[]>();
    for (const cat of RECOMMENDATION_CATEGORY_ORDER) {
      groups.set(cat, []);
    }
    for (const rec of tile.recommendations) {
      const list = groups.get(rec.category);
      if (list) list.push(rec);
    }
    return RECOMMENDATION_CATEGORY_ORDER.map((category) => ({
      category,
      items: groups.get(category) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [tile?.recommendations]);

  const additionalContentTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [];
    if (recommendationsByCategory.length > 0) {
      recommendationsByCategory.forEach(({ category }) => {
        tabs.push({ id: category, label: category });
      });
    }
    if (tile?.list_items && tile.list_items.length > 0) {
      tabs.push({ id: "More", label: "More" });
    }
    return tabs;
  }, [recommendationsByCategory, tile?.list_items]);

  useEffect(() => {
    if (additionalContentTabs.length === 0) {
      setActiveContentTab("");
      return;
    }
    const ids = new Set(additionalContentTabs.map((t) => t.id));
    if (!activeContentTab || !ids.has(activeContentTab)) {
      setActiveContentTab(additionalContentTabs[0].id);
    }
  }, [additionalContentTabs, activeContentTab]);

  useEffect(() => {
    setSearchQuery("");
  }, [activeContentTab]);

  const filteredRecommendationsForActiveTab = useMemo(() => {
    if (activeContentTab === "More") return [];
    const group = recommendationsByCategory.find((g) => g.category === activeContentTab);
    if (!group?.items.length) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return group.items;
    return group.items.filter(
      (rec) =>
        rec.title.toLowerCase().includes(q) ||
        (rec.description?.toLowerCase().includes(q) ?? false) ||
        (rec.recommended_by?.toLowerCase().includes(q) ?? false)
    );
  }, [activeContentTab, recommendationsByCategory, searchQuery]);
  ——— end commented recommendations/tabs ——— */

  const scrollToSection = (slug: string) => {
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(slug);
    }
  };

  const scrollSectionIds = useMemo(
    () =>
      isMemberSessions && memberSessionsToc.length > 0
        ? memberSessionsToc.map((x) => x.slug)
        : tableOfContents.map((item) => item.slug),
    [isMemberSessions, memberSessionsToc, tableOfContents]
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      for (let i = scrollSectionIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(scrollSectionIds[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(scrollSectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollSectionIds]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  if (error) return <p className="max-w-screen-md mx-auto p-8 text-red-500">Error: {error}</p>;
  // Meeting readoutss page always shows the canonical list (document order); tile is optional for links
  if (!tile && !isMemberSessions) return <p className="max-w-screen-md mx-auto p-8 text-subtitle">No tile found.</p>;

  const tocEntries: TocEntry[] =
    isMemberSessions && memberSessionsToc.length > 0 ? memberSessionsToc : tableOfContents;

  function formatSessionDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  /** Render one canonical session row (document date + title, optional View/Download or link). */
  function renderCanonicalSessionItem(session: CanonicalSectionSession, idx: number, subId?: string) {
    const doc = canonicalToDocument.get(session);
    const listItem = canonicalToListItem.get(session);
    const fileUrl = doc?.file?.url && `${process.env.NEXT_PUBLIC_STRAPI_URL}${doc.file.url}`;
    const linkUrl = listItem?.link ?? (listItem?.attachment?.url ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${listItem.attachment.url}` : null);
    const showLinkTbd = session.linkTbd && !fileUrl && !linkUrl;
    const key = subId ? `${session.groupId}-${subId}-${idx}` : `${session.groupId}-${idx}`;
    return (
      <li
        key={key}
        className="flex flex-nowrap items-center gap-x-2 py-1.5 border-b border-gray-100 last:border-b-0"
      >
        <span className="text-base text-primary font-plex shrink-0">
          {session.date} — {session.title}
          {showLinkTbd && <span className="text-subtitle font-normal"> [link TBD]</span>}
        </span>
        {fileUrl && (
          <span className="flex shrink-0 items-center gap-2">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-blue hover:text-brand-orange text-xs font-medium">
              <FaExternalLinkAlt size={10} /> View
            </a>
            <a href={fileUrl} download className="inline-flex items-center gap-1 text-brand-orange hover:opacity-85 text-xs font-medium">
              <FaDownload size={10} /> Download
            </a>
          </span>
        )}
        {!fileUrl && linkUrl && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-blue hover:text-brand-orange text-xs font-medium shrink-0">
            <FaExternalLinkAlt size={10} /> View
          </a>
        )}
      </li>
    );
  }

  function renderSessionItem(item: ListItem) {
    const dateLabel = item.date ? formatSessionDate(item.date) + " — " : "";
    const content = (
      <span className="text-brand-blue font-plex">
        {dateLabel}
        {item.title}
      </span>
    );
    if (item.link) {
      return (
        <a
          key={item.id}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block py-1.5 text-sm hover:text-brand-orange transition-colors border-b border-gray-100 last:border-b-0"
        >
          {content}
          <FaExternalLinkAlt className="inline-block ml-1.5 text-xs text-subtitle" />
        </a>
      );
    }
    return (
      <div
        key={item.id}
        className="py-1.5 text-sm border-b border-gray-100 last:border-b-0"
      >
        {content}
      </div>
    );
  }

  return (
    <div className="relative max-w-screen-xl mx-auto px-6 py-8">
      {/* Left Sidebar - Table of Contents */}
      {tocEntries.length > 0 && (
        <div className="hidden lg:block fixed left-8 top-24 w-48 h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="sticky top-4">
            <h3 className="text-sm font-semibold text-brand-blue mb-4 font-didot uppercase tracking-wider">
              Contents
            </h3>
            <nav className="space-y-1">
              {tocEntries.map((item) => {
                const itemSlug = item.slug ?? item.id;
                return (
                  <button
                    key={itemSlug}
                    onClick={() => scrollToSection(itemSlug)}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-all duration-200 font-plex text-sm ${
                      activeSection === itemSlug
                        ? "bg-peach text-brand-blue font-medium border-l-3 border-brand-orange"
                        : "text-subtitle hover:text-brand-blue hover:bg-gray-100"
                    }`}
                  >
                    {item.title}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-3xl mx-auto">
        <BackToHome />

        {isMemberSessions ? (
          <>
            <h1 className="text-3xl leading-snug font-bold text-brand-blue font-didot">
              Feedforward Meeting readoutss
            </h1>
            <p className="mt-2 text-xl text-gray-700 font-plex font-medium">
              Readout Archive & Thematic Groupings
            </p>
            {memberSessionsCoverage && (
              <p className="mt-1 text-base text-subtitle font-plex">
                Last updated: {memberSessionsCoverage.lastUpdated} &nbsp;&bull;&nbsp; Sessions from {memberSessionsCoverage.dateRange}
              </p>
            )}

            <div className="mt-6 mb-4">
              <div className="relative max-w-xl">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search by title or section (e.g. State of AI, Model Updates)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input pl-11 pr-4 py-2.5 text-sm text-primary font-plex w-full"
                />
              </div>
            </div>

            {filteredCanonicalSessions.length === 0 ? (
              <div className="text-subtitle py-12 text-center font-plex">
                {searchQuery ? "No sessions match your search" : "No sessions found"}
              </div>
            ) : (
              <div className="space-y-10 mt-8">
                {MEMBER_SESSION_GROUPS.map((group) => {
                  const bucket = groupedCanonical.byGroup[group.id];
                  if (!bucket) return null;
                  const hasDirect = (bucket.directSessions?.length ?? 0) > 0;
                  const hasSubGroups = bucket.subGroups && Object.values(bucket.subGroups).some((sg) => sg.sessions.length > 0);
                  if (!hasDirect && !hasSubGroups) return null;

                  return (
                    <section key={group.id} id={group.id} className="scroll-mt-20">
                      <h2 className="text-xl font-bold text-brand-blue font-didot mb-1">
                        {group.emoji} {group.title}
                      </h2>
                      {group.description && (
                        <p className="text-base text-subtitle font-plex mb-4 max-w-2xl">
                          {group.description}
                        </p>
                      )}
                      {bucket.subGroups ? (
                        <div className="space-y-5">
                          {Object.entries(bucket.subGroups)
                            .filter(([, sg]) => sg.sessions.length > 0)
                            .map(([subId, sg]) => (
                              <div key={subId}>
                                <h3 className="text-base font-semibold text-brand-blue font-didot mb-2">
                                  {sg.title}
                                </h3>
                                <ul className="space-y-0 list-none pl-0">
                                  {sg.sessions.map((session, idx) => renderCanonicalSessionItem(session, idx, subId))}
                                </ul>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <ul className="space-y-0 list-none pl-0">
                          {bucket.directSessions?.map((session, idx) => renderCanonicalSessionItem(session, idx))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </>
        ) : tile ? (
          <>
            <h1 className="text-3xl leading-snug capitalize font-bold text-brand-blue font-didot">
              {tile.title}
            </h1>

            {/* External Link Section */}
            {tile.link && (
          <div className="mt-4 bg-white border border-gray-200 p-5 rounded-xl mb-6">
            <a
              href={tile.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-brand-blue hover:text-brand-orange transition-colors font-medium font-plex text-sm"
            >
              Visit External Link <FaExternalLinkAlt className="ml-2 text-xs" />
            </a>
          </div>
        )}

        {/* Docs Content */}
        {tile.docs && tile.docs.length > 0 && (
          <div className="mb-8 space-y-8 mt-6">
            {tile.docs.map((doc: Doc) => {
              const slug = doc.subtitle ? doc.subtitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
              return (
                <div key={doc.id} className="border-b border-gray-200 last:border-b-0 pb-8 last:pb-0">
                  {doc.subtitle && (
                    <h2
                      id={slug}
                      className="text-2xl font-bold text-brand-blue mb-4 font-didot scroll-mt-20"
                    >
                      {doc.subtitle}
                    </h2>
                  )}

                  {doc.content && (
                    <div className="prose prose-lg max-w-none text-gray-800 text-base font-plex leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => <h1 className="text-3xl font-bold text-brand-blue mb-4 font-didot">{children}</h1>,
                          h2: ({children}) => <h2 className="text-2xl font-bold text-brand-blue mb-3 font-didot">{children}</h2>,
                          h3: ({children}) => <h3 className="text-xl font-semibold text-brand-blue mb-2 font-didot">{children}</h3>,
                          h4: ({children}) => <h4 className="text-lg font-semibold text-brand-blue mb-2 font-didot">{children}</h4>,
                          p: ({children}) => <p className="mb-4 text-gray-800 text-base font-plex leading-relaxed">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="text-gray-800 text-base font-plex">{children}</li>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-brand-orange pl-4 italic text-gray-700 mb-4 bg-peach/30 py-3 rounded-r-lg">{children}</blockquote>,
                          code: ({children}) => <code className="bg-gray-100 px-2 py-1 rounded-md text-sm font-mono">{children}</code>,
                          pre: ({children}) => <pre className="bg-gray-100 p-4 rounded-xl overflow-x-auto mb-4">{children}</pre>,
                          a: ({children, href}) => <a href={href} className="text-brand-blue hover:text-brand-orange underline transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>,
                          strong: ({children}) => <strong className="font-bold text-gray-900">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                        }}
                      >
                        {doc.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* List items only (e.g. Additional content: 4 PDFs). Recommendations/tabs commented out above. */}
        {tile.list_items && tile.list_items.length > 0 && (
          <div className="mb-8 mt-8 max-w-3xl">
            <div className="mb-6">
              <div className="relative w-full">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input pl-11 pr-4 py-2.5 text-sm text-primary font-plex w-full rounded-lg border border-card focus:border-brand-blue focus:ring-1 focus:ring-brand-blue shadow-sm"
                />
              </div>
              {/* Date sort button — commented out; list order is from CMS
              <button
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                className="inline-flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-subtitle bg-white hover:bg-gray-50 transition-colors font-plex shrink-0"
                title={`Sort by date (${sortOrder === "desc" ? "newest first" : "oldest first"})`}
              >
                {sortOrder === "desc" ? <FaSortAmountDown className="mr-2" /> : <FaSortAmountUp className="mr-2" />}
                Date {sortOrder === "desc" ? "↓" : "↑"}
              </button>
              */}
            </div>

            <div className="space-y-5">
              {filteredAndSortedListItems.length > 0 ? (
                filteredAndSortedListItems.map((item: ListItem, itemIndex: number) => (
                  <article
                    key={itemIndex}
                    className="rounded-2xl bg-white border border-card shadow-sm overflow-hidden scroll-mt-4"
                  >
                    <div className="w-full px-6 py-5 min-h-[88px]">
                      <h4 className="text-lg font-semibold text-brand-blue mb-1 font-didot leading-snug">{item.title}</h4>

                      {(item.date || item.link) && (
                        <div className="flex items-center gap-2 text-xs font-plex text-subtitle mb-3">
                          {item.date && <span>{new Date(item.date).toLocaleDateString()}</span>}
                          {item.date && item.link && <span>·</span>}
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-blue hover:text-brand-orange transition-colors"
                            >
                              View Link <FaExternalLinkAlt className="inline ml-0.5 text-[10px]" />
                            </a>
                          )}
                        </div>
                      )}

                      {item.attachment?.url && (
                        <div className="mt-4">
                          {item.attachment.mime?.startsWith('image/') ? (
                            <div>
                              <img
                                src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${item.attachment.url}`}
                                alt={item.attachment.alternativeText || item.title}
                                className="max-w-full h-auto rounded-xl border border-card mb-3"
                              />
                              <a
                                href={`${process.env.NEXT_PUBLIC_STRAPI_URL}${item.attachment.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-brand-blue hover:text-brand-orange transition-colors text-sm font-plex"
                              >
                                Open Image <FaExternalLinkAlt className="ml-1.5 text-xs" />
                              </a>
                            </div>
                          ) : (
                            <div className="bg-gray-50/80 border border-card rounded-xl px-6 py-5">
                              {(item.description ?? (item.attachment.size != null && `${Math.round(item.attachment.size / 1024)} KB`)) && (
                                <p className="text-[15px] text-subtitle font-plex leading-relaxed mb-5">
                                  {item.description ?? (item.attachment.size != null ? `${Math.round(item.attachment.size / 1024)} KB` : null)}
                                </p>
                              )}
                              <a
                                href={`${process.env.NEXT_PUBLIC_STRAPI_URL}${item.attachment.url}`}
                                download={item.attachment.name || undefined}
                                className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-brand-blue hover:bg-secondary-blue rounded-lg transition-colors font-plex"
                              >
                                Download File <FaDownload className="ml-2 text-xs" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="py-12 text-center text-subtitle font-plex text-base">
                  {searchQuery ? (
                    <p>No items found matching &ldquo;{searchQuery}&rdquo;</p>
                  ) : (
                    <p>No items available</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ——— Recommendations/tabs UI (commented out; uncomment to restore category tabs + More) ———
        {additionalContentTabs.length > 0 && (
          <div className="mb-8 mt-6">
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4 mb-6">
              {additionalContentTabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveContentTab(tab.id)} ...>{tab.label}</button>
              ))}
            </div>
            ... search bar and tab content (More = list items, else = recommendations by category) ...
          </div>
        )}
        ——— end commented ——— */}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default TilePage;
