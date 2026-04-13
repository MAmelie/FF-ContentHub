"use client";

// Calendly floating “Book an Expert Session” badge disabled for now (see commented implementation below).

export default function CalendlyBadge() {
  return null;
}

/*
"use client";

import { useEffect } from "react";
import {
  CALENDLY_BRAND_PRIMARY_HEX,
  EXPERT_SESSION_CALENDLY_URL,
} from "@/lib/expertSessionCalendly";

declare global {
  interface Window {
    Calendly?: any;
  }
}

const CALENDLY_SCRIPT_SRC =
  "https://assets.calendly.com/assets/external/widget.js";

export default function CalendlyBadge() {
  useEffect(() => {
    let scriptEl: HTMLScriptElement | null = null;
    let weAddedScript = false;

    const init = () => {
      const Calendly = window.Calendly;
      if (!Calendly?.initBadgeWidget) return;
      Calendly.initBadgeWidget({
        url: EXPERT_SESSION_CALENDLY_URL,
        text: "Book an Expert Session",
        color: CALENDLY_BRAND_PRIMARY_HEX,
        textColor: "#ffffff",
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CALENDLY_SCRIPT_SRC}"]`
    );

    if (existing) {
      scriptEl = existing;
      if (window.Calendly?.initBadgeWidget) {
        init();
      } else {
        existing.addEventListener("load", init);
      }
    } else {
      scriptEl = document.createElement("script");
      scriptEl.src = CALENDLY_SCRIPT_SRC;
      scriptEl.async = true;
      scriptEl.onload = init;
      document.body.appendChild(scriptEl);
      weAddedScript = true;
    }

    return () => {
      if (existing) {
        existing.removeEventListener("load", init);
      }
      window.Calendly?.destroyBadgeWidget?.();
      if (weAddedScript && scriptEl?.parentNode) {
        scriptEl.remove();
      }
    };
  }, []);

  return null;
}
*/
