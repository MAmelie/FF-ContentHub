"use client";

import { FaCalendarCheck } from "react-icons/fa";
import { EXPERT_SESSION_CALENDLY_URL } from "@/lib/expertSessionCalendly";

const BASE_CLASS =
  "expert-book-cta inline-flex w-full items-center justify-center rounded-lg text-center font-medium font-plex tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-1 sm:w-auto sm:self-start";

const SIZE_CLASS = {
  default: "gap-2 px-5 py-2.5 text-base",
  compact: "gap-1.5 px-4 py-2 text-sm",
} as const;

export default function BookExpertSessionCta({
  className,
  size = "default",
}: {
  className?: string;
  size?: keyof typeof SIZE_CLASS;
}) {
  const classes = `${BASE_CLASS} ${SIZE_CLASS[size]}${className ? ` ${className}` : ""}`;

  return (
    <a
      href={EXPERT_SESSION_CALENDLY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={classes}
    >
      <FaCalendarCheck
        size={size === "compact" ? 12 : 14}
        className="shrink-0 opacity-95"
        aria-hidden
      />
      Book an Expert Session
    </a>
  );
}
