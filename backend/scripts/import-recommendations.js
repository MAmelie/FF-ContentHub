#!/usr/bin/env node
/**
 * Bulk import recommendations into Strapi from a JSON file.
 *
 * Usage:
 *   node scripts/import-recommendations.js [path/to/recommendations.json]
 *   node scripts/import-recommendations.js data/recommendations.json --tile=my-tile-slug
 *
 * Environment:
 *   STRAPI_URL          Strapi base URL (default: http://localhost:1337)
 *   STRAPI_API_TOKEN    API token with create permission for Recommendation (required)
 *
 * JSON format (array of objects):
 *   category   "What to read" | "What to watch" | "What to listen to" | "Who to follow"
 *   title      string (required)
 *   description, recommended_by, link   optional strings
 *
 * Optional: --tile=slug   After creating recommendations, link them to this tile (by slug).
 */

const fs = require("fs");
const path = require("path");

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const VALID_CATEGORIES = [
  "What to read",
  "What to watch",
  "What to listen to",
  "Who to follow",
];

function usage() {
  console.error(`
Usage: node scripts/import-recommendations.js [file.json] [--tile=slug]

  file.json   Path to JSON array of recommendations (default: data/recommendations.json)
  --tile=slug Optional: link created recommendations to this tile slug

Env: STRAPI_URL (default http://localhost:1337), STRAPI_API_TOKEN (required for create)
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let filePath = path.join(__dirname, "..", "data", "recommendations.json");
  let tileSlug = null;
  for (const a of args) {
    if (a.startsWith("--tile=")) tileSlug = a.slice("--tile=".length);
    else if (!a.startsWith("--")) filePath = path.isAbsolute(a) ? a : path.resolve(process.cwd(), a);
  }
  return { filePath, tileSlug };
}

async function request(method, urlPath, body = null) {
  const url = `${STRAPI_URL.replace(/\/$/, "")}${urlPath}`;
  const headers = {
    "Content-Type": "application/json",
    ...(API_TOKEN && { Authorization: `Bearer ${API_TOKEN}` }),
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || text || res.statusText;
    throw new Error(`${res.status} ${urlPath}: ${msg}`);
  }
  return data;
}

async function getTileIdBySlug(slug) {
  const res = await request("GET", `/api/tiles?filters[slug][$eq]=${encodeURIComponent(slug)}`);
  const list = res?.data ?? res;
  const tile = Array.isArray(list) ? list[0] : list;
  if (!tile) throw new Error(`Tile not found for slug: ${slug}`);
  return tile.id;
}

async function main() {
  const { filePath, tileSlug } = parseArgs();

  if (!API_TOKEN) {
    console.error("STRAPI_API_TOKEN is required. Create an API token in Strapi Admin → Settings → API Tokens with create permission for Recommendation.");
    usage();
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    console.error("Use data/recommendations-sample.json as a template.");
    usage();
    process.exit(1);
  }

  let list;
  try {
    list = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error("Invalid JSON:", filePath, e.message);
    process.exit(1);
  }

  if (!Array.isArray(list)) {
    console.error("JSON file must be an array of recommendation objects.");
    process.exit(1);
  }

  const created = [];
  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    const category = raw.category;
    if (!VALID_CATEGORIES.includes(category)) {
      console.warn(`Skip row ${i + 1}: invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`);
      continue;
    }
    const title = raw.title && String(raw.title).trim();
    if (!title) {
      console.warn(`Skip row ${i + 1}: missing title`);
      continue;
    }
    const data = {
      category,
      title,
      description: raw.description ? String(raw.description) : null,
      recommended_by: raw.recommended_by ? String(raw.recommended_by) : null,
      link: raw.link ? String(raw.link) : null,
    };
    try {
      const res = await request("POST", "/api/recommendations", { data });
      const doc = res?.data ?? res;
      const id = doc?.id ?? doc?.documentId;
      if (id != null) created.push(id);
      console.log("Created:", title);
    } catch (e) {
      console.error("Failed:", title, e.message);
    }
  }

  console.log("\nCreated", created.length, "recommendations.");

  if (tileSlug && created.length > 0) {
    try {
      const tileId = await getTileIdBySlug(tileSlug);
      const res = await request("GET", `/api/tiles/${tileId}?populate=recommendations`);
      const tile = res?.data ?? res;
      const existing = (tile?.recommendations ?? []).map((r) => r.id ?? r.documentId).filter(Boolean);
      const allIds = [...new Set([...existing, ...created])];
      await request("PUT", `/api/tiles/${tileId}`, { data: { recommendations: allIds } });
      console.log("Linked", created.length, "recommendations to tile:", tileSlug);
    } catch (e) {
      console.error("Could not link to tile:", e.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
