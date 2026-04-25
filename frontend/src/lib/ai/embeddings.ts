import OpenAI from "openai";

const embeddingProvider = (process.env.EMBEDDING_PROVIDER || "openai").toLowerCase();
const openAIEmbeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const geminiEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
const MOCK_DIMENSIONS = 256;

let openaiClient: OpenAI | null = null;

function useMockEmbeddings(): boolean {
  return (process.env.USE_MOCK_EMBEDDINGS || "").toLowerCase() === "true";
}

function createMockEmbedding(text: string): number[] {
  const vector = new Array<number>(MOCK_DIMENSIONS).fill(0);
  const normalized = text.toLowerCase().trim();
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

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

async function embedWithGemini(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiEmbeddingModel}:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${geminiEmbeddingModel}`,
        content: { parts: [{ text }] },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini embed failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { embedding?: { values?: number[] } };
  return data.embedding?.values ?? [];
}

export async function embedText(text: string): Promise<number[]> {
  if (useMockEmbeddings()) {
    return createMockEmbedding(text);
  }
  if (embeddingProvider === "gemini") {
    return embedWithGemini(text);
  }
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: openAIEmbeddingModel,
    input: text,
  });
  return response.data[0]?.embedding ?? [];
}

export async function embedTextBatch(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  if (useMockEmbeddings()) {
    return inputs.map((input) => createMockEmbedding(input));
  }
  if (embeddingProvider === "gemini") {
    const embeddings: number[][] = [];
    for (const input of inputs) {
      embeddings.push(await embedWithGemini(input));
    }
    return embeddings;
  }
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: openAIEmbeddingModel,
    input: inputs,
  });
  return response.data.map((item: { embedding: number[] }) => item.embedding);
}

export function getEmbeddingModel(): string {
  return embeddingProvider === "gemini" ? geminiEmbeddingModel : openAIEmbeddingModel;
}
