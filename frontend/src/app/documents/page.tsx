// app/documents/page.tsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { getAllDocuments } from "../../../lib/api";
import { Document } from "../../../lib/types";
import Loader from "../../components/Loader";
import BackToHome from "../../components/BackToHome";
import { FaSearch, FaDownload } from "react-icons/fa";
import { MEMBER_SESSION_GROUPS } from "../tiles/member-sessions-config";

function isPdfDocument(doc: Document): boolean {
  const mime = (doc.file?.mime ?? doc.file?.mimeType ?? "").toString().toLowerCase();
  if (!mime) return false;
  if (mime.includes("audio") || mime.includes("mpeg") || mime.includes("mp3") || mime.includes("ogg") || mime.includes("wav")) return false;
  return mime.includes("pdf");
}

function formatSessionDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeSubGroupId(id: string): string {
  // Strapi subgroup values are stored as strings; depending on how you created the
  // admin selections they might include spaces/slashes. Normalize both sides so
  // grouping stays stable.
  return id
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Trigger download via blob so cross-origin PDFs download instead of opening in-browser. */
async function downloadDocument(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename.replace(/[^\w\s.-]/g, "").replace(/\s+/g, "-").slice(0, 120) + ".pdf";
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("Download failed, opening in new tab:", err);
    window.open(url, "_blank");
  }
}

const DocumentsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const data = await getAllDocuments();
        setDocuments(data.documents.filter(isPdfDocument));
      } catch (err) {
        console.error("Error fetching documents:", err);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  /** Effective group: "slides" if title contains "slides", else Strapi sessionGroup, else "more". All PDFs appear. */
  function effectiveSessionGroup(doc: Document): string {
    if (doc.title.toLowerCase().includes("slides")) return "slides";
    if (doc.sessionGroup && doc.sessionGroup.trim() !== "") return doc.sessionGroup;
    return "more";
  }

  /** All PDFs with effective group (so every document appears under a section). */
  const documentsWithGroup = useMemo(() => {
    return documents.map((doc) => ({ doc, effectiveGroup: effectiveSessionGroup(doc) }));
  }, [documents]);

  /** Filter by search: title or section/group name. */
  const filteredDocumentsWithGroup = useMemo(() => {
    if (!searchQuery.trim()) return documentsWithGroup;
    const q = searchQuery.toLowerCase().trim();
    return documentsWithGroup.filter(({ doc, effectiveGroup }) => {
      if (doc.title.toLowerCase().includes(q)) return true;
      const group = MEMBER_SESSION_GROUPS.find((g) => g.id === effectiveGroup);
      if (group?.title.toLowerCase().includes(q) || group?.description?.toLowerCase().includes(q)) return true;
      if (doc.sessionSubGroup && group?.subGroups) {
        const subGroupId = doc.sessionSubGroup;
        const sg = group.subGroups.find((s) => normalizeSubGroupId(s.id) === normalizeSubGroupId(subGroupId));
        if (sg?.title.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [documentsWithGroup, searchQuery]);

  /** Group filtered documents by effectiveGroup / sessionSubGroup, sorted by publishedDate (then order) within each bucket. */
  const groupedBySection = useMemo(() => {
    const byGroup: Record<
      string,
      | { directSessions: Document[] }
      | { subGroups: Record<string, Document[]>; directSessions?: Document[] }
    > = {};

    const sortDocs = (a: Document, b: Document) => {
      const dateA = a.publishedDate ?? a.publishedAt ? new Date(a.publishedDate ?? a.publishedAt).getTime() : 0;
      const dateB = b.publishedDate ?? b.publishedAt ? new Date(b.publishedDate ?? b.publishedAt).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      const oA = a.order ?? 999;
      const oB = b.order ?? 999;
      return oA - oB;
    };

    for (const group of MEMBER_SESSION_GROUPS) {
      const docsInGroup = filteredDocumentsWithGroup
        .filter(({ effectiveGroup }) => effectiveGroup === group.id)
        .map(({ doc }) => doc);
      if (docsInGroup.length === 0) continue;

      if (group.subGroups && group.subGroups.length > 0) {
        const subGroups: Record<string, Document[]> = {};
        const directInGroup: Document[] = [];
        for (const doc of docsInGroup) {
          const subGroupId = doc.sessionSubGroup;
          let matchedSubGroupId: string | undefined;
          if (subGroupId && group.subGroups.length > 0) {
            for (const configuredSubGroup of group.subGroups) {
              if (normalizeSubGroupId(configuredSubGroup.id) === normalizeSubGroupId(subGroupId)) {
                matchedSubGroupId = configuredSubGroup.id;
                break;
              }
            }
          }

          if (matchedSubGroupId) {
            const id = matchedSubGroupId; // Use config id so headings render correctly.
            if (!subGroups[id]) subGroups[id] = [];
            subGroups[id].push(doc);
          } else {
            directInGroup.push(doc);
          }
        }
        for (const id of Object.keys(subGroups)) subGroups[id].sort(sortDocs);
        directInGroup.sort(sortDocs);
        if (Object.keys(subGroups).length > 0 || directInGroup.length > 0) {
          byGroup[group.id] = { subGroups, ...(directInGroup.length > 0 && { directSessions: directInGroup }) };
        }
      } else {
        byGroup[group.id] = { directSessions: docsInGroup.sort(sortDocs) };
      }
    }

    return byGroup;
  }, [filteredDocumentsWithGroup]);

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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <BackToHome />

      <h1 className="text-3xl leading-snug font-bold text-brand-blue font-didot">
        Meeting readouts
      </h1>
      <p className="mt-2 text-xl text-gray-700 font-plex font-medium">
        Archive
      </p>
      <p className="mt-1 text-base text-subtitle font-plex">
        Last updated: March 2026 &nbsp;&bull;&nbsp; Sessions from 2024  – March 2026
      </p>

      <div className="mt-6 mb-6">
        <div className="relative w-full max-w-2xl">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search by title or section (e.g. State of AI, Model Updates)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full pl-11 pr-4 py-2.5 text-sm font-plex text-primary bg-white rounded-lg border border-gray-200"
            aria-label="Search documents by title or section"
          />
        </div>
      </div>

      {filteredDocumentsWithGroup.length === 0 ? (
        <div className="text-subtitle p-12 text-center font-plex">
          {searchQuery ? "No documents match your search" : "No PDF documents found."}
        </div>
      ) : (
        <div className="space-y-10 mt-8">
          {MEMBER_SESSION_GROUPS.map((group) => {
            const bucket = groupedBySection[group.id];
            if (!bucket) return null;

            const directSessions = (bucket as { directSessions?: Document[] }).directSessions;
            const hasDirect = (directSessions?.length ?? 0) > 0;
            const hasSubGroups =
              "subGroups" in bucket &&
              bucket.subGroups &&
              Object.values(bucket.subGroups).some((arr) => arr.length > 0);
            if (!hasDirect && !hasSubGroups) return null;

            return (
              <section key={group.id} id={group.id} className="scroll-mt-20">
                <h2 className="text-xl font-bold text-brand-blue font-didot mb-4">
                  {group.emoji} {group.title}
                </h2>
                {"subGroups" in bucket && bucket.subGroups ? (
                  <div className="space-y-5">
                    {Object.entries(bucket.subGroups)
                      .filter(([, docs]) => docs.length > 0)
                      .map(([subId, docs]) => {
                        const sg = group.subGroups?.find((s) => s.id === subId);
                        return (
                          <div key={subId}>
                            {sg && (
                              <h3 className="text-base font-semibold text-brand-blue font-didot mb-2">
                                {sg.title}
                              </h3>
                            )}
                            <ul className="space-y-2 list-none pl-0">
                              {docs.map((doc) => {
                                const fileUrl =
                                  doc.file?.url &&
                                  `${process.env.NEXT_PUBLIC_STRAPI_URL}${doc.file.url}`;
                                const displayDate = formatSessionDate(doc.publishedDate ?? doc.publishedAt);
                                return (
                                  <li
                                    key={doc.id}
                                    className="group flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1.5 py-1.5 border-b border-gray-100 last:border-b-0 transition-colors"
                                  >
                                    {fileUrl ? (
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="min-w-0 text-base sm:text-lg leading-snug text-primary font-plex whitespace-normal break-words [overflow-wrap:anywhere] hover:!text-[#e9a059] group-hover:!text-[#e9a059] transition-colors cursor-pointer"
                                      >
                                        {doc.title} — {displayDate}
                                      </a>
                                    ) : (
                                      <span className="min-w-0 text-base sm:text-lg leading-snug text-primary font-plex whitespace-normal break-words [overflow-wrap:anywhere]">
                                        {doc.title} — {displayDate}
                                      </span>
                                    )}
                                    {fileUrl && (
                                      <span className="inline-flex items-center gap-2 sm:pt-0.5">
                                        <button
                                          type="button"
                                          onClick={() => downloadDocument(fileUrl, doc.title)}
                                          className="inline-flex items-center gap-1 whitespace-nowrap text-brand-orange hover:opacity-85 text-xs sm:text-sm font-medium bg-transparent border-0 cursor-pointer p-0 font-plex"
                                        >
                                          <FaDownload size={10} />
                                          Download
                                        </button>
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    {"directSessions" in bucket && (bucket.directSessions?.length ?? 0) > 0 && (
                      <div className="mt-4">
                        <ul className="space-y-2 list-none pl-0">
                          {bucket.directSessions!.map((doc) => {
                            const fileUrl =
                              doc.file?.url &&
                              `${process.env.NEXT_PUBLIC_STRAPI_URL}${doc.file.url}`;
                            const displayDate = formatSessionDate(doc.publishedDate ?? doc.publishedAt);
                            return (
                              <li
                                key={doc.id}
                                className="group flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1.5 py-1.5 border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                {fileUrl ? (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-w-0 text-base sm:text-lg leading-snug text-primary font-plex whitespace-normal break-words [overflow-wrap:anywhere] hover:!text-[#e9a059] group-hover:!text-[#e9a059] transition-colors cursor-pointer"
                                  >
                                    {doc.title} — {displayDate}
                                  </a>
                                ) : (
                                  <span className="min-w-0 text-base sm:text-lg leading-snug text-primary font-plex whitespace-normal break-words [overflow-wrap:anywhere]">
                                    {doc.title} — {displayDate}
                                  </span>
                                )}
                                {fileUrl && (
                                  <span className="inline-flex items-center gap-2 sm:pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => downloadDocument(fileUrl, doc.title)}
                                      className="inline-flex items-center gap-1 whitespace-nowrap text-brand-orange hover:opacity-85 text-xs sm:text-sm font-medium bg-transparent border-0 cursor-pointer p-0 font-plex"
                                    >
                                      <FaDownload size={10} /> Download
                                    </button>
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2 list-none pl-0">
                    {"directSessions" in bucket &&
                      bucket.directSessions?.map((doc) => {
                        const fileUrl =
                          doc.file?.url &&
                          `${process.env.NEXT_PUBLIC_STRAPI_URL}${doc.file.url}`;
                        const displayDate = formatSessionDate(doc.publishedDate ?? doc.publishedAt);
                        return (
                          <li
                            key={doc.id}
                            className="group flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1.5 py-1.5 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            {fileUrl ? (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-0 text-base sm:text-lg leading-snug text-primary font-plex whitespace-normal break-words [overflow-wrap:anywhere] hover:!text-[#e9a059] group-hover:!text-[#e9a059] transition-colors cursor-pointer"
                              >
                                {doc.title} — {displayDate}
                              </a>
                            ) : (
                              <span className="min-w-0 text-base sm:text-lg leading-snug text-primary font-plex whitespace-normal break-words [overflow-wrap:anywhere]">
                                {doc.title} — {displayDate}
                              </span>
                            )}
                            {fileUrl && (
                              <span className="inline-flex items-center gap-2 sm:pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => downloadDocument(fileUrl, doc.title)}
                                  className="inline-flex items-center gap-1 whitespace-nowrap text-brand-orange hover:opacity-85 text-xs sm:text-sm font-medium bg-transparent border-0 cursor-pointer p-0 font-plex"
                                >
                                  <FaDownload size={10} />
                                  Download
                                </button>
                              </span>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-base text-subtitle font-plex">
        Total: {filteredDocumentsWithGroup.length} document
        {filteredDocumentsWithGroup.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
};

export default DocumentsPage;
