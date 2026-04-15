// src/components/Footer.tsx
"use client";

import React from "react";

const Footer = () => {
  return (
    <footer id="site-footer" className="w-full mt-auto">
      <div className="h-px bg-gradient-to-r from-transparent via-brand-orange to-transparent" />

      <div className="py-8" style={{ background: "var(--nav-footer-gradient)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-center items-center">
          <p className="text-sm text-white/60 font-plex text-center">
            &copy; 2026 Feedforward
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
