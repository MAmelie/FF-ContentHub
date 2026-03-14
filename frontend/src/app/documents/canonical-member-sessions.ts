/**
 * Canonical list of Feedforward Meeting readoutss (Readout Archive).
 * Order and dates match the official document; links are merged from Strapi when available.
 * Sessions not yet in Strapi are still shown with document date; use linkTbd for "[link TBD]".
 */

export interface CanonicalSession {
  /** Display date from the document (e.g. "Sept 11, 2025") */
  date: string;
  /** Session title from the document */
  title: string;
  /** If true, show "[link TBD]" — document not yet available */
  linkTbd?: boolean;
}

export interface CanonicalSectionSession extends CanonicalSession {
  groupId: string;
  subGroupId?: string;
}

/** All sessions in display order, with groupId/subGroupId for thematic grouping. */
export const CANONICAL_MEMBER_SESSIONS: CanonicalSectionSession[] = [
  // 🤖 Conversations with AI Labs (Model Makers Series)
  { groupId: "ai-labs", date: "Sept 11, 2025", title: "Model Makers: Google — World Models & Google Labs product building" },
  { groupId: "ai-labs", date: "Nov 20, 2025", title: "Model Makers: Google — Gemini 3 and the compute advantage" },
  { groupId: "ai-labs", date: "Feb 10, 2026", title: "Model Makers: Google — World Models & Genie 3 (deep dive)" },
  { groupId: "ai-labs", date: "Feb 18, 2026", title: "Model Makers: Anthropic — Claude Cowork & Claude Code with Boris Cherny & Felix Rieseberg" },
  // 📡 State of AI / Model Updates — General Model Updates
  { groupId: "state-of-ai", subGroupId: "general-model-updates", date: "Jan 9, 2025", title: "New Year Kickoff: O3, vibe shift, competitive landscape" },
  { groupId: "state-of-ai", subGroupId: "general-model-updates", date: "Feb 6, 2025", title: "AI Model Developments & Strategic Implications (DeepSeek era)" },
  { groupId: "state-of-ai", subGroupId: "general-model-updates", date: "Feb 27, 2025", title: "Exploring Recent AI Model Releases (Claude 3.7, Grok 3, GPT 4.5)" },
  { groupId: "state-of-ai", subGroupId: "general-model-updates", date: "Apr 15, 2025", title: "Model Updates + Member Exchanges (GPT 4.1, context windows)" },
  { groupId: "state-of-ai", subGroupId: "general-model-updates", date: "Jun 12, 2025", title: "o3-Pro drops + generative audio goes enterprise-ready" },
  { groupId: "state-of-ai", subGroupId: "general-model-updates", date: "Jul 15, 2025", title: "State of AI and the Models (Moonshot Kimi K2, xAI)" },
  { groupId: "state-of-ai", subGroupId: "general-model-updates", date: "Oct 6, 2025", title: "State of AI and the Models" },
  // 📡 State of AI — Coding Agents & Agentic Shift
  { groupId: "state-of-ai", subGroupId: "coding-agents", date: "Jan 8, 2026", title: "2026 Kickoff: Coding Agents and the Post-GPT World" },
  { groupId: "state-of-ai", subGroupId: "coding-agents", date: "Jan 29, 2026", title: "\"We're in a Different Era Now\" — Claude Code, agent harnesses, skills repositories" },
  // 🏢 Enterprise AI Transformation
  { groupId: "enterprise", date: "Jun 25, 2025", title: "Scaling AI at Moderna — Brice Challamel (zero budget, 1-person team)" },
  { groupId: "enterprise", date: "Aug 7, 2025", title: "AI Transformation with Ayham Boucher (member showcase)" },
  { groupId: "enterprise", date: "Nov 4, 2025", title: "AI Transformation at Norges Bank — Nicolai Tangen (100% AI adoption, 50% coding)" },
  { groupId: "enterprise", date: "Jan 21, 2026", title: "Member Show-and-Tell — JPMC Private Bank AI Coach + others", linkTbd: true },
  // 🦾 Agentic AI, Coding & Technical Practice
  { groupId: "agentic-technical", date: "Feb 11, 2025", title: "Member Show-and-Tell: Agentic AI (Dan Shapiro demos)" },
  { groupId: "agentic-technical", date: "Apr 2, 2025", title: "IRL Hybrid @ Hearst: LibreChat Playground Launch + Cybernetic Teammate Research + Vibe Coding Demo" },
  { groupId: "agentic-technical", date: "Apr 23, 2025", title: "Creating Agentic Systems in Practice with Primer" },
  { groupId: "agentic-technical", date: "Jun 4, 2025", title: "AI Coding Tools: Vibe Coding (Simon Willison + Dan Shapiro)" },
  { groupId: "agentic-technical", date: "Sep 29, 2025", title: "Agent Show-and-Tell (coding agents, AI Factory, video agents)" },
  { groupId: "agentic-technical", date: "Dec 10, 2025", title: "Beyond the Prompts: Context Engineering" },
  // 🔮 Strategy, Leadership & the Future of Work
  { groupId: "strategy-leadership", date: "Mar 12, 2025", title: "AI & Future of Work — Daniel Rock, Wharton (300–600% productivity potential)" },
  { groupId: "strategy-leadership", date: "May 22, 2025", title: "AI & Innovation — Wharton research on AI brainstorming" },
  { groupId: "strategy-leadership", date: "Jul 30, 2025", title: "\"Reid-out\": State of AI Startups with Reid Hoffman (Greylock)" },
  { groupId: "strategy-leadership", date: "Oct 22, 2025", title: "Charting AI Futures — enterprise grievances + scenario planning" },
  { groupId: "strategy-leadership", date: "Dec 16, 2025", title: "Leading Through AI Transformation — Claudine Gartenberg, Wharton" },
  { groupId: "strategy-leadership", date: "Feb 20, 2026", title: "Expert Session: Jessica Johnston and Adam Davidson" },
  // 🔒 Security & Risk
  { groupId: "security", date: "Jan 29, 2025", title: "AI & Security — Simon Willison (prompt injection, unresolved vulnerabilities)" },
  // 🔍 Vendor Analysis
  { groupId: "vendor", date: "Sep 16, 2025", title: "IRL NYC: Vendor Analysis + Context Engineering deep dive" },
];
