"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getDisplayName, getUser } from "../../../lib/auth";

const STEP_KEYS = ["1", "2", "3", "4", "5"] as const;
const STORAGE_PREFIX = "feedforward-step-";

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

export default function OnboardingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [welcomeText, setWelcomeText] = useState("Welcome to Feedforward!");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nameFromUrl = params.get("name")?.trim();
    const user = getUser();
    const fromUser = user ? getDisplayName(user) : "";
    if (nameFromUrl) {
      setWelcomeText(`Welcome to Feedforward, ${nameFromUrl}!`);
    } else if (fromUser) {
      setWelcomeText(`Welcome to Feedforward, ${fromUser}!`);
    } else {
      setWelcomeText("Welcome to Feedforward!");
    }
  }, []);

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    STEP_KEYS.forEach((step) => {
      initial[step] = localStorage.getItem(`${STORAGE_PREFIX}${step}`) === "true";
    });
    setCheckedSteps(initial);
  }, []);

  const allStepsComplete = STEP_KEYS.every((s) => checkedSteps[s]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    root.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const onStepChange = useCallback((step: string, checked: boolean) => {
    localStorage.setItem(`${STORAGE_PREFIX}${step}`, String(checked));
    setCheckedSteps((prev) => ({ ...prev, [step]: checked }));
  }, []);

  const toggleFaq = useCallback((id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a[href^='#']") as HTMLAnchorElement | null;
      if (!anchor || !root.contains(anchor)) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const el = document.querySelector(href);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  return (
    <div ref={rootRef} className="onboarding-page">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content fade-in">
            <h1 className="hero-title-gold" id="welcome-heading">
              {welcomeText}
            </h1>
            <p>
              You&apos;re in. Here&apos;s everything you need to hit the ground running with fellow business leaders on
              the frontier of AI.
            </p>
          </div>
          <div className="hero-visual fade-in">
            <div className="forge-rings">
              <div className="ring ring-1" />
              <div className="ring ring-2" />
              <div className="ring ring-3" />
              <div className="ring-center">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M17 20.5H7V4L12 8l5-4v16.5zM7 2a2 2 0 00-2 2v16.5a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2H7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="section-container">
          <div className="section-header fade-in">
            <h2>How the Community Works</h2>
            <p style={{ marginBottom: "1rem" }}>
              Feedforward is a private, peer-to-peer community for business leaders actively building the future of AI.
            </p>
            <p>
              This is a space where participation and shared learning create value for everyone, while operating under
              strict Chatham House Rules.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card fade-in">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <h3>Peer Learning</h3>
              <p>
                Connect with senior leaders who are actively building AI products and facing similar challenges in their
                organizations.
              </p>
            </div>
            <div className="feature-card fade-in">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                </svg>
              </div>
              <h3>
                <a
                  href="https://discord.com/channels/1254761492608188517/1255174556851638424/1290387859148111903"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chatham-link"
                >
                  Chatham House Rules
                </a>
              </h3>
              <p>Speak freely knowing that what&apos;s shared stays within the community. Build trust through confidentiality.</p>
            </div>
            <div className="feature-card fade-in">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <h3>Active Participation</h3>
              <p>The more you engage, the more value you receive. Share your experiences and learn from others&apos; journeys.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="membership" id="membership">
        <div className="section-container">
          <div className="section-header fade-in">
            <h2>Nuts + Bolts of Membership</h2>
            <p>
              Your membership includes access to live sessions, a private community, expert advisors, and exclusive
              content—all designed to accelerate your AI journey.
            </p>
          </div>
          <div className="membership-grid">
            <div className="membership-card fade-in">
              <div className="membership-card-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                </svg>
              </div>
              <h3>Regular Member Sessions</h3>
              <p>
                Join interactive virtual sessions each month featuring member-led discussions, expert presentations, and
                collaborative problem-solving. We also host 2-3 IRL member meetings each year.
              </p>
            </div>
            <div className="membership-card fade-in">
              <div className="membership-card-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
                </svg>
              </div>
              <h3>Discord Community</h3>
              <p>
                Access our{" "}
                <a href="https://discord.gg/X57TPEErKf" target="_blank" rel="noopener noreferrer">
                  private Discord server
                </a>{" "}
                for ongoing discussions you can&apos;t get anywhere else! Get the latest insights on AI, ask questions,
                share resources and connect with members between sessions.
              </p>
            </div>
            <div className="membership-card fade-in">
              <div className="membership-card-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3>Expert Advisory Sessions</h3>
              <p>
                Use your included credits to book one-on-one advisory sessions with industry experts, tailored to your
                specific AI questions and challenges.
              </p>
            </div>
            <div className="membership-card fade-in">
              <div className="membership-card-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
              </div>
              <h3>Members-Only Content & Tools</h3>
              <p>
                Access meeting readouts, case studies, members-only podcast and curated content, plus an &quot;AI
                Playground&quot; - our membership sandbox for testing new AI models as soon as they drop. Delivered via
                FF Discord and membership emails.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="first-90-days" id="first-90-days">
        <div className="section-container">
          <div className="section-header fade-in">
            <h2>Your First 90 Days</h2>
            <p style={{ color: "white" }}>Get the most from your Feedforward Collective membership.</p>
          </div>
          <div className="timeline">
            {[
              {
                step: "1",
                title: "Select Your Fellow Members",
                body: "If you haven't already, share your 3 members and we'll handle the rest.",
              },
              {
                step: "2",
                title: "Join Discord",
                body: (
                  <>
                    Use this{" "}
                    <a href="https://discord.gg/X57TPEErKf" target="_blank" rel="noopener noreferrer">
                      invite
                    </a>{" "}
                    and don&apos;t forget to introduce yourself when you join. Share what you&apos;re working on and hoping to
                    learn.
                  </>
                ),
              },
              {
                step: "3",
                title: "Attend Your Kick-off Call",
                body: "Meet with Feedforward's Founding team members, share your top priorities and questions for the coming months, get real time help and set-up for more.",
              },
              {
                step: "4",
                title: "Participate in Live Sessions",
                body: "Join upcoming member sessions to access + share insights, discuss challenges, and hear from experts.",
              },
              {
                step: "5",
                title: "Schedule Your First Expert Advisory Session",
                body: (
                  <>
                    Reach out to <a href="mailto:maddie@feedforward.ai">Maddie</a> to book a one-on-one Expert
                    Advisory/Consultation session with our FF expert network for personalized guidance.
                  </>
                ),
              },
            ].map(({ step, title, body }) => (
              <div
                key={step}
                className={`timeline-item fade-in${checkedSteps[step] ? " completed" : ""}`}
              >
                <div className="timeline-number">{step}</div>
                <div className="timeline-content">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
                <label className="timeline-checkbox">
                  <input
                    type="checkbox"
                    data-step={step}
                    checked={!!checkedSteps[step]}
                    onChange={(e) => onStepChange(step, e.target.checked)}
                  />
                  <span className="checkmark" />
                </label>
              </div>
            ))}
          </div>
          <div className={`checklist-congrats${allStepsComplete ? " visible" : ""}`} id="checklist-congrats">
            <h3>You&apos;re all set!</h3>
            <p>
              You&apos;ve completed all 5 onboarding steps. Welcome to the Feedforward community — we&apos;re glad you&apos;re
              here.
            </p>
          </div>
        </div>
      </section>

      <section className="tips" id="tips">
        <div className="section-container">
          <div className="section-header fade-in">
            <h2>Three Tips for Success</h2>
            <p>Make the most of your Feedforward membership with these recommendations.</p>
          </div>
          <div className="tips-grid">
            <div className="tip-card fade-in">
              <span className="tip-number">01</span>
              <h3>Participate Actively</h3>
              <p>
                The community thrives on member participation. Share your experiences, ask questions, and engage in
                discussions. The more you put in, the more you&apos;ll get out.
              </p>
            </div>
            <div className="tip-card fade-in">
              <span className="tip-number">02</span>
              <h3>Distribute Your Learnings</h3>
              <p>
                Bring insights back to your team. The knowledge you gain is meant to be shared and applied within your
                organization to multiply its impact.
              </p>
            </div>
            <div className="tip-card fade-in">
              <span className="tip-number">03</span>
              <h3>Use Expert Sessions Early</h3>
              <p>
                Don&apos;t wait to schedule your expert advisory sessions. Book them early to get personalized guidance while
                challenges are fresh and decisions are pending.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="faq" id="faq">
        <div className="section-container">
          <div className="section-header fade-in">
            <h2>Frequently Asked Questions</h2>
            <p>Quick answers to common questions about your membership.</p>
          </div>
          <div className="faq-list">
            {FAQ_ITEMS.map((item) => (
              <div key={item.id} className={`faq-item fade-in${openFaqId === item.id ? " is-active" : ""}`}>
                <button type="button" className="faq-question" onClick={() => toggleFaq(item.id)} aria-expanded={openFaqId === item.id}>
                  <h3>{item.question}</h3>
                  <svg className="faq-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                </button>
                <div className="faq-answer">
                  <div className="faq-answer-inner">{item.answer}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
