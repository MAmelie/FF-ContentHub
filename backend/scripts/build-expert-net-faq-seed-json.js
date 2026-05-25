#!/usr/bin/env node
/** One-off helper: regenerate data/expert-net-faq-seed.json from frontend fallback. */
const fs = require("fs");
const path = require("path");

const srcPath = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "lib",
  "expertNetFaqFallback.ts"
);
const outPath = path.join(__dirname, "..", "data", "expert-net-faq-seed.json");
const src = fs.readFileSync(srcPath, "utf8");

const blockRe =
  /category:\s*"([^"]+)",\s*\n\s*q:\s*"((?:\\.|[^"\\])*)",\s*\n\s*a:\s*"((?:\\.|[^"\\])*)",\s*\n\s*sort_order:\s*(\d+)/g;

const faq_items = [];
let m;
while ((m = blockRe.exec(src)) !== null) {
  faq_items.push({
    category: m[1],
    question: m[2].replace(/\\"/g, '"'),
    answer: m[3].replace(/\\"/g, '"'),
    sort_order: Number(m[4]),
  });
}

const payload = {
  faq_heading: "Frequently asked questions",
  faq_always_visible_category: "Overview",
  faq_items,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${faq_items.length} FAQ items to ${outPath}`);
