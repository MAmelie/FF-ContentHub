import { NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embeddings";
import { loadDocumentIndex, searchDocumentIndex } from "@/lib/ai/document-index";

const MIN_QUERY_LENGTH = 2;
const MIN_SCORE = Number.parseFloat(process.env.SEARCH_MIN_SCORE || "0.2");
const DYNAMIC_SCORE_DELTA = Number.parseFloat(process.env.SEARCH_DYNAMIC_DELTA || "0.08");
const STOPWORDS = new Set([
  "the",
  "and",
  "or",
  "for",
  "with",
  "from",
  "into",
  "about",
  "over",
  "under",
  "this",
  "that",
  "your",
  "you",
  "our",
  "are",
  "was",
  "were",
  "can",
  "not",
  "but",
  "how",
  "what",
  "when",
  "where",
  "why",
  "who",
  "ein",
  "eine",
  "und",
  "oder",
  "mit",
  "von",
  "ist",
  "sind",
  "der",
  "die",
  "das",
]);

const QUERY_EXPANSIONS: Record<string, string[]> = {
  governance: ["policy", "regulation", "compliance", "risk"],
  policy: ["governance", "regulation", "compliance"],
  regulation: ["governance", "policy", "compliance"],
  compliance: ["governance", "policy", "regulation"],
  risk: ["governance", "safety", "compliance"],
  safety: ["risk", "governance", "alignment"],
  security: ["safety", "risk", "compliance"],
  ai: ["artificial", "intelligence", "llm", "model"],
  llm: ["ai", "model", "language", "models"],
  model: ["models", "llm", "ai"],
  models: ["model", "llm", "ai"],
  evaluation: ["benchmark", "testing", "assessment"],
  benchmarks: ["evaluation", "testing", "metrics"],
};

function isLikelyGibberishQuery(input: string): boolean {
  const q = input.toLowerCase().trim();
  const tokens = q.split(/[^a-z0-9]+/g).filter((token) => token.length > 0);
  if (tokens.length !== 1) return false;

  const token = tokens[0];
  if (token.length < 6) return false;

  const vowels = (token.match(/[aeiou]/g) || []).length;
  const uniqueChars = new Set(token).size;
  const maxCharCount = Math.max(...Array.from(new Set(token)).map((ch) => token.split(ch).length - 1));
  const repeatedCharRatio = maxCharCount / token.length;

  return vowels === 0 || uniqueChars <= 3 || repeatedCharRatio >= 0.5;
}

function tokenizeForMatch(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function matchTokensFromExpandedQuery(expandedQuery: string): string[] {
  return [...new Set(tokenizeForMatch(expandedQuery))];
}

function buildExpandedQuery(input: string): string {
  const originalTokens = input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  if (originalTokens.length === 0) return input;
  const extraTokens = new Set<string>();
  for (const token of originalTokens) {
    const expansions = QUERY_EXPANSIONS[token];
    if (!expansions) continue;
    for (const expansion of expansions) {
      if (!originalTokens.includes(expansion)) {
        extraTokens.add(expansion);
      }
    }
  }
  if (extraTokens.size === 0) return input;
  return `${input} ${Array.from(extraTokens).join(" ")}`.trim();
}

function shouldDebugQuery(input: string): boolean {
  const normalized = input.toLowerCase().trim().replace(/\s+/g, " ");
  if (process.env.SEARCH_DEBUG_LOG === "true") return true;
  return (
    normalized === "machine learning" || normalized === "governance" || normalized === "consulting"
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { q?: unknown };
    const q = typeof body.q === "string" ? body.q.trim() : "";

    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({ error: "Query must be at least 2 characters." }, { status: 400 });
    }
    if (isLikelyGibberishQuery(q)) {
      return NextResponse.json({ results: [] });
    }

    const expandedQuery = buildExpandedQuery(q);
    const debugQuery = shouldDebugQuery(q);
    const queryEmbedding = await embedText(expandedQuery);
    const index = await loadDocumentIndex();
    const rawResults = searchDocumentIndex(index, queryEmbedding, {
      queryText: expandedQuery,
      minScore: 0,
    });
    const configuredMinScore = Number.isFinite(MIN_SCORE) ? MIN_SCORE : 0.2;
    const results = rawResults.filter((result) => result.score >= configuredMinScore);
    if (debugQuery) {
      const allScorePreview = rawResults.slice(0, 10).map((result) => {
        const chunk = index.chunks.find((item) => String(item.documentId) === String(result.id));
        return {
          id: result.id,
          title: chunk?.title || "Untitled",
          score: Number(result.score.toFixed(4)),
        };
      });
      const preview = results.slice(0, 25).map((result) => {
        const chunk = index.chunks.find((item) => String(item.documentId) === String(result.id));
        return {
          id: result.id,
          title: chunk?.title || "Untitled",
          score: Number(result.score.toFixed(4)),
        };
      });
      console.log("[search-debug] all-scores-before-min-filter", {
        query: q,
        expandedQuery,
        top: allScorePreview,
      });
      console.log("[search-debug] raw-ranking", {
        query: q,
        expandedQuery,
        minScore: configuredMinScore,
        dynamicDelta: Number.isFinite(DYNAMIC_SCORE_DELTA) ? DYNAMIC_SCORE_DELTA : 0.08,
        top: preview,
      });
    }
    if (results.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const queryTokens = matchTokensFromExpandedQuery(expandedQuery);

    const docTextById = new Map<string, string>();
    for (const chunk of index.chunks) {
      const id = String(chunk.documentId);
      const existing = docTextById.get(id) || "";
      const next = `${existing} ${chunk.title || ""} ${chunk.textPreview || ""}`.trim().toLowerCase();
      docTextById.set(id, next);
    }

    const gated = results
      .map((result) => {
        const docText = docTextById.get(String(result.id)) || "";
        const matchedCount = queryTokens.reduce((count, token) => (docText.includes(token) ? count + 1 : count), 0);
        return { ...result, matchedCount };
      })
      .map((item) => {
        if (queryTokens.length === 2 && item.matchedCount === 2) {
          return { ...item, score: item.score + 0.08 };
        }
        if (queryTokens.length >= 3) {
          const overlap = item.matchedCount / queryTokens.length;
          return { ...item, score: item.score + overlap * 0.05 };
        }
        return item;
      })
      .filter((item, _index, arr) => {
        const top = arr[0]?.score ?? -Infinity;
        if (!Number.isFinite(top)) return false;
        const relativeFloor = top - (Number.isFinite(DYNAMIC_SCORE_DELTA) ? DYNAMIC_SCORE_DELTA : 0.08);
        const absoluteFloor = Number.isFinite(MIN_SCORE) ? MIN_SCORE : 0.2;
        const threshold = Math.max(absoluteFloor, relativeFloor);
        return item.score >= threshold;
      })
      .sort((a, b) => b.score - a.score)
      .map(({ id, score }) => ({ id, score }));

    if (debugQuery) {
      const finalPreview = gated.slice(0, 25).map((result) => {
        const chunk = index.chunks.find((item) => String(item.documentId) === String(result.id));
        return {
          id: result.id,
          title: chunk?.title || "Untitled",
          score: Number(result.score.toFixed(4)),
        };
      });
      console.log("[search-debug] after-gating", {
        query: q,
        resultCountBefore: results.length,
        resultCountAfter: gated.length,
        top: finalPreview,
      });
    }

    return NextResponse.json({ results: gated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("ENOENT")) {
      return NextResponse.json(
        { error: "Document index missing. Run rebuild:document-index first." },
        { status: 503 },
      );
    }
    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json({ error: "Server misconfigured: missing OPENAI_API_KEY." }, { status: 500 });
    }
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
