#!/usr/bin/env node
/**
 * Seed Expert-Net FAQ items into Strapi (single type).
 *
 * Usage (from backend/):
 *   STRAPI_API_TOKEN=... node scripts/seed-expert-net-faq.js
 *
 * Optional: STRAPI_URL (default http://localhost:1337)
 * Pass --dry-run to print payload without writing.
 */

const fs = require("fs");
const path = require("path");

const STRAPI_URL = (process.env.STRAPI_URL || "http://localhost:1337").replace(
  /\/$/,
  ""
);
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");

const DATA_PATH = path.join(
  __dirname,
  "..",
  "data",
  "expert-net-faq-seed.json"
);

async function request(method, urlPath, body = null) {
  const url = `${STRAPI_URL}${urlPath}`;
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

function loadSeed() {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.faq_items)) {
    throw new Error("expert-net-faq-seed.json must have faq_items array");
  }
  return parsed;
}

async function main() {
  if (!API_TOKEN && !DRY_RUN) {
    console.error("Set STRAPI_API_TOKEN (Settings → API Tokens in Strapi admin).");
    process.exit(1);
  }

  const seed = loadSeed();
  const getRes = await request("GET", "/api/expert-net");
  const existing = getRes?.data;
  if (!existing) {
    throw new Error("Expert-Net single type not found. Create it in Strapi admin first.");
  }

  const documentId = existing.documentId ?? existing.id;
  const payload = {
    data: {
      faq_heading: seed.faq_heading ?? existing.faq_heading,
      faq_always_visible_category:
        seed.faq_always_visible_category ?? existing.faq_always_visible_category,
      faq_items: seed.faq_items,
    },
  };

  if (DRY_RUN) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  await request("PUT", `/api/expert-net?documentId=${documentId}`, payload);
  console.log(
    `Updated Expert-Net FAQ: ${seed.faq_items.length} items (documentId=${documentId}). Publish in admin if needed.`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
