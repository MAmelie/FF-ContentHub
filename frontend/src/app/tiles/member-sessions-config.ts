/**
 * Thematic grouping for the Meeting readoutss tile (Readout Archive).
 * Slug of the tile in Strapi must match MEMBER_SESSIONS_TILE_SLUG in this file.
 * List items are assigned to groups by matching their title (substring, case-insensitive)
 * against the patterns in each group/subgroup. First match wins.
 */

export const MEMBER_SESSIONS_TILE_SLUG = "member-sessions";

export interface ThematicSubGroup {
  id: string;
  title: string;
  /** Substrings to match list_item.title (case-insensitive). First match wins. */
  patterns: string[];
}

export interface ThematicGroup {
  id: string;
  emoji: string;
  title: string;
  description?: string;
  /** Top-level sessions (no subgroup). Matched by patterns. */
  patterns?: string[];
  /** Optional subgroups with their own patterns. */
  subGroups?: ThematicSubGroup[];
}

export const MEMBER_SESSION_GROUPS: ThematicGroup[] = [
  {
    id: "ai-labs",
    emoji: "🤖",
    title: "Conversations with AI Labs (Model Makers Series) and other special guests",
    description:
      "Direct, exclusive sessions with AI lab insiders. Your most differentiated content.",
    patterns: [
      "Model Makers: Google",
      "Model Makers: Anthropic",
      "World Models",
      "Gemini 3",
      "Genie 3",
      "Claude Cowork",
      "Claude Code",
      "Boris Cherny",
      "Felix Rieseberg",
    ],
  },
  {
    id: "state-of-ai",
    emoji: "📡",
    title: "State of AI / Model Updates",
    description:
      "Regular cadence sessions tracking the model landscape — bread-and-butter Feedforward content.",
    subGroups: [
      {
        id: "general-model-updates",
        title: "General Model Updates",
        patterns: [
          "New Year Kickoff",
          "O3",
          "vibe shift",
          "AI Model Developments",
          "Strategic Implications",
          "DeepSeek",
          "Exploring Recent AI Model Releases",
          "Claude 3.7",
          "Grok 3",
          "GPT 4.5",
          "Model Updates + Member Exchanges",
          "GPT 4.1",
          "context windows",
          "o3-Pro drops",
          "generative audio",
          "State of AI and the Models",
          "Moonshot Kimi K2",
          "xAI",
        ],
      },
      {
        id: "coding-agents",
        title: "Coding Agents & Agentic Shift",
        patterns: [
          "Coding Agents",
          "Post-GPT World",
          "Different Era Now",
          "agent harnesses",
          "skills repositories",
        ],
      },
      {
        id: "in-person-hybrid",
        title: "In-Person / Hybrid",
        // Optional: these patterns are used by `assignToThematicGroup` (if enabled later).
        // `documents/page.tsx` primarily matches by `sessionSubGroup` from Strapi.
        patterns: ["In-Person / Hybrid", "in-person-hybrid", "In-Person", "Hybrid"],
      },
    ],
  },
  {
    id: "enterprise",
    emoji: "🏢",
    title: "Enterprise AI Transformation (Member & Expert Stories)",
    description:
      "Companies sharing real-world journeys — peer learning at its best. High-signal, high-engagement sessions.",
    patterns: [
      "Scaling AI at Moderna",
      "Brice Challamel",
      "AI Transformation with Ayham",
      "Ayham Boucher",
      "Norges Bank",
      "Nicolai Tangen",
      "JPMC",
      "Private Bank AI Coach",
      "Show-and-Tell — JPMC",
    ],
    subGroups: [
      {
        id: "expert-show-and-tell",
        title: "Expert Show-and-Tell",
        patterns: ["expert-show-and-tell", "Expert Show-and-Tell", "Show-and-Tell"],
      },
      {
        id: "leading-ai-transformation",
        title: "Leading AI Transformation",
        patterns: ["leading-ai-transformation", "Leading AI Transformation", "Leading Through AI Transformation"],
      },
      {
        id: "member-and-expert-show-and-tell",
        title: "Member and Expert Show-and-Tell",
        patterns: [
          "member-and-expert-show-and-tell",
          "Member and Expert Show-and-Tell",
          "Member Show-and-Tell",
        ],
      },
    ],
  },
  {
    id: "agentic-technical",
    emoji: "🦾",
    title: "Agentic AI & Software Development",
    description:
      "Hands-on, demo-forward sessions on building and deploying agentic systems. Includes tool launches and live builds.",
    patterns: [
      "Agentic AI",
      "Dan Shapiro",
      "IRL Hybrid @ Hearst",
      "LibreChat",
      "Cybernetic Teammate",
      "Vibe Coding Demo",
      "Creating Agentic Systems",
      "Primer",
      "AI Coding Tools: Vibe Coding",
      "Simon Willison",
      "Agent Show-and-Tell",
      "AI Factory",
      "video agents",
      "Beyond the Prompts",
      "Context Engineering",
    ],
  },
  {
    id: "strategy-leadership",
    emoji: "🔮",
    title: "Strategy, Leadership & the Future of Work",
    description:
      "Higher-altitude thinking on AI's organizational and economic implications — often featuring Wharton researchers and thought leaders.",
    patterns: [
      "Future of Work",
      "Daniel Rock",
      "Wharton",
      "productivity potential",
      "AI & Innovation",
      "brainstorming",
      "Reid-out",
      "Reid Hoffman",
      "Greylock",
      "Charting AI Futures",
      "scenario planning",
      "Leading Through AI Transformation",
      "Claudine Gartenberg",
      "Jessica Johnston",
      "Adam Davidson",
    ],
  },
  {
    id: "security",
    emoji: "🔒",
    title: "Security & Risk",
    description:
      "Sessions on AI security, prompt injection, and emerging vulnerabilities — what to watch and how to mitigate.",
    patterns: [
      "AI & Security",
      "prompt injection",
      "unresolved vulnerabilities",
      "Simon Willison",
    ],
  },
  {
    id: "vendor",
    emoji: "🔍",
    title: "Vendor Analysis",
    description:
      "Sessions focused on evaluating the AI vendor landscape — more to come as this becomes a standing track.",
    patterns: ["Vendor Analysis", "IRL NYC"],
  },
  {
    id: "slides",
    emoji: "📎",
    title: "Slides",
    description: "Slide decks and presentation materials from sessions.",
    patterns: ["Slides", "slides"],
  },
  {
    id: "more",
    emoji: "📂",
    title: "More",
    description: "Additional documents and readouts not yet categorized.",
    patterns: [],
  },
];

/** Assign a list item to a group id and optional subgroup id by matching title. */
export function assignToThematicGroup(
  itemTitle: string,
  groups: ThematicGroup[] = MEMBER_SESSION_GROUPS
): { groupId: string; subGroupId?: string } | null {
  const lower = itemTitle.toLowerCase();
  for (const group of groups) {
    if (group.subGroups) {
      for (const sub of group.subGroups) {
        if (sub.patterns.some((p) => lower.includes(p.toLowerCase())))
          return { groupId: group.id, subGroupId: sub.id };
      }
    }
    if (group.patterns?.some((p) => lower.includes(p.toLowerCase())))
      return { groupId: group.id };
  }
  return null;
}
