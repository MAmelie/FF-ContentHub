import fs from "node:fs/promises";
import path from "node:path";

export interface DocumentIndexChunk {
  documentId: string;
  chunkIndex: number;
  title?: string;
  sessionGroup?: string;
  sessionSubGroup?: string;
  publishedAt?: string;
  lowTextExtraction?: boolean;
  extractedCharCount?: number;
  textPreview?: string;
  embedding: number[];
}

export interface DocumentIndexFile {
  version: 1;
  generatedAt: string;
  model: string;
  chunkSize: number;
  overlap: number;
  sourceCount: number;
  chunks: DocumentIndexChunk[];
}

export interface SearchResult {
  id: string;
  score: number;
}

const INDEX_PATH = path.join(process.cwd(), "data", "ai-index.json");

let cachedIndex: DocumentIndexFile | null = null;

export async function loadDocumentIndex(): Promise<DocumentIndexFile> {
  if (cachedIndex) return cachedIndex;
  const raw = await fs.readFile(INDEX_PATH, "utf-8");
  const parsed = JSON.parse(raw) as DocumentIndexFile;
  cachedIndex = parsed;
  return parsed;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function searchDocumentIndex(
  index: DocumentIndexFile,
  queryEmbedding: number[],
  options?: { topKChunks?: number; topKDocuments?: number; queryText?: string; minScore?: number },
): SearchResult[] {
  const topKChunks = options?.topKChunks ?? 40;
  const topKDocuments = options?.topKDocuments ?? 20;
  const minScore = options?.minScore ?? 0;
  const queryTokens = new Set(
    (options?.queryText || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map((token) => token.trim())
      .filter((token) => token.length > 1),
  );

  const chunkScores = index.chunks
    .map((chunk) => ({
      documentId: chunk.documentId,
      title: chunk.title || "",
      sessionGroup: chunk.sessionGroup || "",
      sessionSubGroup: chunk.sessionSubGroup || "",
      publishedAt: chunk.publishedAt || "",
      lowTextExtraction: Boolean(chunk.lowTextExtraction),
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topKChunks);

  const bestByDocument = new Map<
    string,
    {
      score: number;
      title: string;
      sessionGroup: string;
      sessionSubGroup: string;
      publishedAt: string;
      lowTextExtraction: boolean;
    }
  >();
  for (const item of chunkScores) {
    const current = bestByDocument.get(item.documentId);
    if (current === undefined || item.score > current.score) {
      bestByDocument.set(item.documentId, {
        score: item.score,
        title: item.title,
        sessionGroup: item.sessionGroup,
        sessionSubGroup: item.sessionSubGroup,
        publishedAt: item.publishedAt,
        lowTextExtraction: item.lowTextExtraction,
      });
    }
  }

  const lexicalBoost = (text: string): number => {
    if (queryTokens.size === 0) return 0;
    const textTokens = new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length > 1),
    );
    if (textTokens.size === 0) return 0;
    let matches = 0;
    for (const token of queryTokens) {
      if (textTokens.has(token)) matches += 1;
    }
    const overlapRatio = matches / queryTokens.size;
    return overlapRatio * 0.2;
  };

  const ranked = Array.from(bestByDocument.entries())
    .map(([id, info]) => ({
      id,
      score:
        info.score +
        lexicalBoost(info.title) +
        // Metadata boost: reward overlaps in title + group fields.
        lexicalBoost(`${info.title} ${info.sessionGroup} ${info.sessionSubGroup}`) * 0.5 +
        // Penalize OCR/scanned-like low-text PDFs so they do not dominate ranking.
        (info.lowTextExtraction ? -0.18 : 0),
      publishedAt: info.publishedAt,
    }))
    .filter((item) => item.score >= minScore);

  const timestamps = ranked
    .map((item) => new Date(item.publishedAt).getTime())
    .filter((ts) => Number.isFinite(ts));
  const minTs = timestamps.length > 0 ? Math.min(...timestamps) : null;
  const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : null;
  const topSemanticScore = ranked.length > 0 ? Math.max(...ranked.map((item) => item.score)) : -Infinity;

  return ranked
    .map((item) => {
      const ts = new Date(item.publishedAt).getTime();
      if (minTs === null || maxTs === null || !Number.isFinite(ts) || maxTs <= minTs) {
        return { id: item.id, score: item.score };
      }
      const recencyNorm = (ts - minTs) / (maxTs - minTs);
      // Only use recency as a tie-breaker for near-equal semantic scores.
      const scoreGap = Math.max(0, topSemanticScore - item.score);
      const tieWeight = Math.max(0, 1 - scoreGap / 0.06);
      const recencyBoost = recencyNorm * 0.04 * tieWeight;
      return { id: item.id, score: item.score + recencyBoost };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topKDocuments);
}
