/** Default Expert Network FAQ when Strapi has no faq_items (matches prior hardcoded copy). */
export const EXPERT_NET_FALLBACK_FAQ: {
  category: string;
  q: string;
  a: string;
  sort_order?: number;
}[] = [
  {
    category: "Overview",
    q: "What are expert sessions?",
    a: "Expert Sessions: 60-minute virtual advisory sessions with a Feedforward expert on topics of your choice. Sessions can take many forms: fireside chats, pressure-testing your AI strategy, live red-teaming your products, and more. Booked with membership credits. Standard meeting size (typically < 12-15 people), internal use only. No prep call, just a short intake form, and we'll handle the rest.",
    sort_order: 1,
  },
  {
    category: "Overview",
    q: "What are speaking engagements?",
    a: "Speaking Engagements: Presentation style talks designed for larger audiences such as company-wide townhalls, department meetings, offsites, leadership summits, or team kickoffs. Can be virtual or in person. Each engagement includes a 30 minute prep call so the speaker can tailor the content to your audience and goals. Available at an additional cost beyond your membership.",
    sort_order: 2,
  },
  {
    category: "Participation & Attendance",
    q: "What counts as an expert session?",
    a: "Expert sessions are company-specific advisory and consultation sessions, not speaking engagements. Many experts in our network also do speaking engagements at different rates. If you're interested in a speaking engagement, Feedforward can facilitate.",
    sort_order: 3,
  },
  {
    category: "Participation & Attendance",
    q: "Who can we invite to expert sessions?",
    a: "Anyone from your organization can attend, including non-members and cross-functional partners. Use the Book an Expert Session button on this page to choose a time. If you want colleagues to book their own sessions using your credits or need help with roster logistics, contact Maddie.",
    sort_order: 4,
  },
  {
    category: "Participation & Attendance",
    q: "Can we use expert sessions for talks with clients or customers?",
    a: "No, expert sessions are for internal use only.",
    sort_order: 5,
  },
  {
    category: "Participation & Attendance",
    q: "How many people can attend?",
    a: "There's no hard limit, but please be reasonable. Keep it under 20 people for a real conversation.",
    sort_order: 6,
  },
  {
    category: "Participation & Attendance",
    q: "Can multiple experts join one session?",
    a: "Yes, but each expert costs the same number of credits.",
    sort_order: 7,
  },
  {
    category: "Planning & Logistics",
    q: "How long is the typical session?",
    a: "60 minutes.",
    sort_order: 8,
  },
  {
    category: "Planning & Logistics",
    q: "What formats are available?",
    a: "Fireside chats, informal conversations, or mini research talks followed by Q&A. For something outside the usual formats, contact Maddie.",
    sort_order: 9,
  },
  {
    category: "Planning & Logistics",
    q: "Are sessions in-person or virtual?",
    a: "Virtual only.",
    sort_order: 10,
  },
  {
    category: "Planning & Logistics",
    q: "How do I book an expert session?",
    a: "Start with the Book an Expert Session button on this page. It opens our scheduling flow so you can pick a time. For credits, billing, non-standard formats, or if you want us to help match you to an expert, contact Maddie or Gina.",
    sort_order: 11,
  },
  {
    category: "Planning & Logistics",
    q: "What preparation is required?",
    a: "Complete the steps in the scheduling flow and any intake or context questions you're asked before the session. If prep isn't completed, we may need to reschedule. If you're unsure what's required, ask Maddie or Gina.",
    sort_order: 12,
  },
  {
    category: "Planning & Logistics",
    q: "Can I do a prep call with the expert?",
    a: "Experts don't do prep calls. (Do you really want another meeting?!). Instead, use the scheduling and intake steps to share context. If a prep call is essential, contact Maddie.",
    sort_order: 13,
  },
  {
    category: "Planning & Logistics",
    q: "Can I record the session?",
    a: "Not usually. In limited cases, we may allow recording for internal use. Ask Maddie in advance.",
    sort_order: 14,
  },
  {
    category: "Planning & Logistics",
    q: "Can experts sign an NDA before our session?",
    a: "Yes. Your Feedforward agreement covers confidentiality, but experts can sign additional NDAs upon request. Please coordinate through Maddie.",
    sort_order: 15,
  },
  {
    category: "Planning & Logistics",
    q: "What if I need to cancel or reschedule?",
    a: "Use the confirmation and links from your scheduling email when possible, and notify Maddie and the expert as soon as you can. If an expert needs to reschedule due to unforeseen circumstances, we'll let you know.",
    sort_order: 16,
  },
  {
    category: "Planning & Logistics",
    q: "What video platform can we use (Zoom, Teams, etc.)?",
    a: "Your choice—Zoom, Teams, whatever you use. We default to Zoom unless you tell us otherwise.",
    sort_order: 17,
  },
  {
    category: "Content & Follow-up",
    q: "Can I hire an expert for an extended consulting engagement with my company?",
    a: "Yes, we'll connect you.",
    sort_order: 18,
  },
  {
    category: "Content & Follow-up",
    q: "Can I ask follow-up questions after the session?",
    a: "Yes! Our experts are very active on Discord. That's the place to ask follow-up questions. Many members also book additional sessions with the same expert.",
    sort_order: 19,
  },
  {
    category: "Content & Follow-up",
    q: "Will I receive any materials after the session?",
    a: "Sessions are conversations, not presentations, so there are no handouts. We recommend taking notes, and experts are reachable on Discord for follow-ups.",
    sort_order: 20,
  },
];

export const EXPERT_NET_FALLBACK_FAQ_HEADING = "Frequently asked questions";
export const EXPERT_NET_FALLBACK_FAQ_ALWAYS_VISIBLE_CATEGORY = "Overview";
