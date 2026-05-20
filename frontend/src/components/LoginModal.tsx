"use client";

import React, { useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";
import { loginWithTestUser } from "../../lib/auth";
import { setStoredPostLoginReturn } from "../../lib/return-path";

const BACKEND_URL = process.env.NEXT_PUBLIC_STRAPI_URL;
const isDev = process.env.NODE_ENV === "development";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleDiscordLogin = () => {
    if (!BACKEND_URL) {
      alert("Backend URL not configured. Set NEXT_PUBLIC_STRAPI_URL for Discord login.");
      return;
    }
    if (typeof window !== "undefined") {
      const path = `${window.location.pathname}${window.location.search}`;
      setStoredPostLoginReturn(path);
    }
    window.location.href = `${BACKEND_URL}/api/connect/discord`;
  };

  const handleTestUser = () => {
    loginWithTestUser();
    onClose();
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-sm rounded-xl shadow-xl p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <FaTimes size={18} />
        </button>

        <h2 id="login-modal-title" className="text-xl font-semibold font-didot text-gray-900 dark:text-white pr-8">
          Log in
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 font-plex">
          Sign in with Discord to use the Content Hub.
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleDiscordLogin}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white bg-[#5865F2] hover:bg-[#4752C4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2] transition-colors font-medium text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Log in with Discord
          </button>

          {isDev && (
            <button
              type="button"
              onClick={handleTestUser}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
            >
              Use test user (dev only)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
