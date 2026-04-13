/**
 * Expert session scheduling (Calendly).
 * Query params align with design tokens in globals.css (--brand-blue, --brand-orange).
 */
const CALENDLY_PATH = "cvpg-n7z-8vy";
const BG = "f5f2eb";
const TEXT = "1a3f69";
const PRIMARY = "e9a059";

export const EXPERT_SESSION_CALENDLY_URL =
  `https://calendly.com/d/${CALENDLY_PATH}?background_color=${BG}&text_color=${TEXT}&primary_color=${PRIMARY}`;

/** Hex with # for Calendly badge widget `color` / embed options */
export const CALENDLY_BRAND_PRIMARY_HEX = `#${PRIMARY}`;
