import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import OpenAI from "openai";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");
const PDFParse = pdfParseModule.PDFParse ?? pdfParseModule.default?.PDFParse ?? pdfParseModule.default;

function parseDotEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadLocalEnvFiles() {
  const root = process.cwd();
  const envPaths = [path.join(root, ".env.local"), path.join(root, ".env")];
  for (const envPath of envPaths) {
    try {
      const raw = await fs.readFile(envPath, "utf-8");
      const parsed = parseDotEnv(raw);
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
      // Skip missing env files.
    }
  }
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const EMBEDDING_BATCH_SIZE = 50;
const MOCK_DIMENSIONS = 256;
const LOW_TEXT_THRESHOLD = 250;

function getConfig() {
  const EMBEDDING_PROVIDER = (process.env.EMBEDDING_PROVIDER || "openai").toLowerCase();
  const STRAPI_URL = (process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "").replace(/\/$/, "");
  const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || "";
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
  const EMBEDDING_MODEL = EMBEDDING_PROVIDER === "gemini"
    ? process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004"
    : process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const USE_MOCK_EMBEDDINGS = (process.env.USE_MOCK_EMBEDDINGS || "").toLowerCase() === "true";
  const MAX_DOCS_RAW = process.env.MAX_DOCS || "";
  const parsedMaxDocs = Number.parseInt(MAX_DOCS_RAW, 10);
  const MAX_DOCS = Number.isFinite(parsedMaxDocs) && parsedMaxDocs > 0 ? parsedMaxDocs : null;
  return {
    EMBEDDING_PROVIDER,
    STRAPI_URL,
    STRAPI_API_TOKEN,
    OPENAI_API_KEY,
    GEMINI_API_KEY,
    EMBEDDING_MODEL,
    USE_MOCK_EMBEDDINGS,
    MAX_DOCS,
  };
}

function assertEnv(config) {
  const {
    STRAPI_URL,
    OPENAI_API_KEY,
    GEMINI_API_KEY,
    USE_MOCK_EMBEDDINGS,
    EMBEDDING_PROVIDER,
  } = config;
  if (!STRAPI_URL) throw new Error("Missing STRAPI_URL (or NEXT_PUBLIC_STRAPI_URL).");
  if (USE_MOCK_EMBEDDINGS) return;
  if (EMBEDDING_PROVIDER === "gemini" && !GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY.");
  if (EMBEDDING_PROVIDER !== "gemini" && !OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY.");
}

function chunkText(input) {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
    if (i + CHUNK_SIZE >= text.length) break;
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function strapiGet(urlPath, config) {
  const headers = config.STRAPI_API_TOKEN ? { Authorization: `Bearer ${config.STRAPI_API_TOKEN}` } : undefined;
  const response = await fetch(`${config.STRAPI_URL}${urlPath}`, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Strapi request failed (${response.status}): ${urlPath}\n${body}`);
  }
  return response.json();
}

async function downloadBuffer(url, config) {
  const headers = config.STRAPI_API_TOKEN ? { Authorization: `Bearer ${config.STRAPI_API_TOKEN}` } : undefined;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`PDF fetch failed (${response.status}): ${url}`);
  const ab = await response.arrayBuffer();
  return Buffer.from(ab);
}

async function extractPdfText(buffer) {
  if (!PDFParse) {
    throw new Error("PDFParse class unavailable from pdf-parse module.");
  }
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result?.text || "").trim();
  } finally {
    await parser.destroy();
  }
}

function resolvePdfUrl(raw, config) {
  if (!raw || typeof raw !== "string") return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${config.STRAPI_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function isPdfAsset(fileAttrs, fileUrl) {
  const mime = String(fileAttrs?.mime || fileAttrs?.mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return true;
  return typeof fileUrl === "string" && fileUrl.toLowerCase().includes(".pdf");
}

function getDocumentId(doc) {
  if (typeof doc.id === "number") return String(doc.id);
  if (typeof doc.documentId === "string") return doc.documentId;
  if (doc.id) return String(doc.id);
  return "";
}

function createMockEmbedding(text) {
  const vector = new Array(MOCK_DIMENSIONS).fill(0);
  const normalized = String(text || "").toLowerCase().trim();
  if (!normalized) return vector;

  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    const idx = (code + i * 31) % MOCK_DIMENSIONS;
    vector[idx] += ((code % 13) + 1) / 13;
  }

  let magnitude = 0;
  for (const value of vector) magnitude += value * value;
  const norm = Math.sqrt(magnitude) || 1;
  return vector.map((value) => value / norm);
}

async function embedWithGemini(text, config) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(config.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${config.EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
      }),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini embed failed (${response.status}): ${body}`);
  }
  const data = await response.json();
  return data?.embedding?.values ?? [];
}

async function main() {
  await loadLocalEnvFiles();
  const config = getConfig();
  assertEnv(config);
  const openai = config.USE_MOCK_EMBEDDINGS || config.EMBEDDING_PROVIDER === "gemini"
    ? null
    : new OpenAI({ apiKey: config.OPENAI_API_KEY });
  const docsPayload = await strapiGet("/api/documents?populate=file&pagination[pageSize]=200", config);
  const allDocs = Array.isArray(docsPayload?.data) ? docsPayload.data : [];
  const docs = config.MAX_DOCS ? allDocs.slice(0, config.MAX_DOCS) : allDocs;
  console.log(
    `Loaded ${docs.length}/${allDocs.length} documents${config.MAX_DOCS ? ` (MAX_DOCS=${config.MAX_DOCS})` : ""}`,
  );
  if (config.USE_MOCK_EMBEDDINGS) {
    console.log("Using mock embeddings (USE_MOCK_EMBEDDINGS=true).");
  } else {
    console.log(`Using embedding provider: ${config.EMBEDDING_PROVIDER} (${config.EMBEDDING_MODEL})`);
  }

  const sourceChunks = [];
  let emptyExtractions = 0;
  let lowTextExtractions = 0;

  for (const doc of docs) {
    const attrs = doc.attributes || doc;
    const id = getDocumentId(doc);
    const title = attrs.title || "Untitled document";
    const description = attrs.description || "";
    const sessionGroup = String(attrs.sessionGroup || "").trim();
    const sessionSubGroup = String(attrs.sessionSubGroup || "").trim();
    const publishedAt = String(attrs.publishedDate || attrs.publishedAt || "").trim();
    const file = attrs.file || {};
    const fileAttrs = file?.attributes || file?.data?.attributes || file;
    const fileUrl = resolvePdfUrl(fileAttrs?.url, config);

    if (!id || !fileUrl) continue;
    if (!isPdfAsset(fileAttrs, fileUrl)) continue;

    let extractedText = "";
    try {
      const pdfBuffer = await downloadBuffer(fileUrl, config);
      extractedText = await extractPdfText(pdfBuffer);
    } catch (error) {
      console.warn(`[WARN] Failed to parse PDF for ${id}:`, error instanceof Error ? error.message : error);
    }

    const isLowTextExtraction = extractedText.length > 0 && extractedText.length < LOW_TEXT_THRESHOLD;
    if (isLowTextExtraction) lowTextExtractions += 1;
    const baseContext = `${title}\n\n${description}`.trim();
    const textToChunk = isLowTextExtraction
      ? baseContext
      : extractedText
      ? `${baseContext}\n\n${extractedText}`.trim()
      : baseContext;
    if (!extractedText) emptyExtractions += 1;
    const chunks = chunkText(textToChunk);
    chunks.forEach((chunk, chunkIndex) => {
      sourceChunks.push({
        documentId: id,
        title,
        sessionGroup,
        sessionSubGroup,
        publishedAt,
        lowTextExtraction: isLowTextExtraction,
        extractedCharCount: extractedText.length,
        chunkIndex,
        text: chunk,
      });
    });
  }

  const embeddings = [];
  for (let i = 0; i < sourceChunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = sourceChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    if (config.USE_MOCK_EMBEDDINGS) {
      embeddings.push(...batch.map((item) => createMockEmbedding(item.text)));
    } else if (config.EMBEDDING_PROVIDER === "gemini") {
      for (const item of batch) {
        embeddings.push(await embedWithGemini(item.text, config));
      }
    } else {
      const response = await openai.embeddings.create({
        model: config.EMBEDDING_MODEL,
        input: batch.map((item) => item.text),
      });
      embeddings.push(...response.data.map((item) => item.embedding));
    }
    console.log(`Embedded ${Math.min(i + EMBEDDING_BATCH_SIZE, sourceChunks.length)}/${sourceChunks.length} chunks`);
  }

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
      model: config.EMBEDDING_MODEL,
    chunkSize: CHUNK_SIZE,
    overlap: CHUNK_OVERLAP,
    sourceCount: docs.length,
    chunks: sourceChunks.map((chunk, index) => ({
      documentId: chunk.documentId,
      title: chunk.title,
      sessionGroup: chunk.sessionGroup,
      sessionSubGroup: chunk.sessionSubGroup,
      publishedAt: chunk.publishedAt,
      lowTextExtraction: chunk.lowTextExtraction,
      extractedCharCount: chunk.extractedCharCount,
      chunkIndex: chunk.chunkIndex,
      textPreview: chunk.text.slice(0, 180),
      embedding: embeddings[index] || [],
    })),
  };

  const outDir = path.join(process.cwd(), "data");
  const outPath = path.join(outDir, "ai-index.json");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Wrote ${output.chunks.length} chunks to ${outPath}`);
  console.log(`PDFs with empty extraction fallback: ${emptyExtractions}`);
  console.log(`PDFs with low-text extraction fallback (<${LOW_TEXT_THRESHOLD} chars): ${lowTextExtractions}`);
}

main().catch((error) => {
  if (error?.message?.includes("RESOURCE_EXHAUSTED")) {
    console.error("Gemini quota exceeded. Increase quota/billing, then rerun.");
    process.exit(1);
  }
  if (error?.status === 429 || error?.code === "insufficient_quota") {
    console.error("OpenAI quota exceeded (429 insufficient_quota). Add billing/credits, then rerun.");
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
