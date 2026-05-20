"use client";

import { useCallback, useId, useState, type ReactNode } from "react";

const FAQ_ITEMS: { id: string; question: string; answer: ReactNode }[] = [
  {
    id: "discord-access",
    question: "How do I access Discord?",
    answer: (
      <p>
        Use this{" "}
        <a href="https://discord.gg/X57TPEErKf" target="_blank" rel="noopener noreferrer">
          invite
        </a>{" "}
        to access the Feedforward Discord.
      </p>
    ),
  },
  {
    id: "expert-sessions",
    question: "How do I use and book expert sessions?",
    answer: (
      <p>
        Reach out to{" "}
        <a href="mailto:maddie@feedforward.ai">Maddie</a> to book a session. Sessions are virtual and run 45-60
        minutes. (Gentle reminder - these are not speaking engagements. They are consultation/advisory sessions)
        Learn more about our Expert Network and how to book these sessions via the updated member portal (coming
        soon).
      </p>
    ),
  },
  {
    id: "member-selection",
    question: "How are Feedforward members selected?",
    answer: (
      <p>
        We curate for quality - senior leaders and practitioners actively working on AI who can both contribute and
        benefit. If you want to refer a business leader and their company to join, please reach out to FF co-founder,{" "}
        <a href="mailto:jessica@feedforward.ai">Jessica Johnston</a>.
      </p>
    ),
  },
  {
    id: "connect-members",
    question: "Can I connect with specific members?",
    answer: <p>Yes, of course! Reach out via Discord or request an introduction from our team.</p>,
  },
  {
    id: "rotation",
    question: "What's the rotation policy?",
    answer: (
      <p>
        Membership renews annually, and is invite-only. We rotate periodically to keep participation active. Engaged
        members in good standing are typically invited to renew.
      </p>
    ),
  },
  {
    id: "additional-services",
    question: "Are additional services available?",
    answer: (
      <p>
        Yes: extra advisory credits, team workshops, and strategic consulting, and Foundry.{" "}
        <a href="mailto:maddie@feedforward.ai">Contact us</a> to learn more.
      </p>
    ),
  },
  {
    id: "guest",
    question: "Can I bring a guest?",
    answer: (
      <p>
        Handled case-by-case. Reach out in advance—we aim to maintain our intimate, trusted environment for the
        Feedforward community.
      </p>
    ),
  },
];

function FaqEntry({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const uid = useId();
  const triggerId = `${uid}-trigger`;
  const panelId = `${uid}-panel`;

  return (
    <div className={`onboarding-faq__item${isOpen ? " onboarding-faq__item--open" : ""}`}>
      <button
        type="button"
        id={triggerId}
        className="onboarding-faq__trigger"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span className="onboarding-faq__question">{question}</span>
        <span className="onboarding-faq__chevron" aria-hidden>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className="onboarding-faq__panel"
        aria-hidden={!isOpen}
      >
        <div className="onboarding-faq__panel-inner">{answer}</div>
      </div>
    </div>
  );
}

export default function OnboardingFaq() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="onboarding-faq">
      {FAQ_ITEMS.map((item) => (
        <FaqEntry
          key={item.id}
          question={item.question}
          answer={item.answer}
          isOpen={openId === item.id}
          onToggle={() => toggle(item.id)}
        />
      ))}
    </div>
  );
}
