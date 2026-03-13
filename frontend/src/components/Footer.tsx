// src/components/Footer.tsx
"use client";

import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="w-full mt-auto">
      {/* gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand-orange to-transparent" />

      <div className="bg-brand-blue py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* <Link href="/" className="shrink-0">
              <img
                src="/FF-PrimaryLockup_RGB.png"
                alt="Feedforward AI"
                className="h-10 w-auto"
              />
            </Link> */}
            <p className="text-sm text-white/60 font-plex">
              &copy; 2026 Feedforward
            </p>
          </div>
{/* 
          <ul className="flex items-center gap-6 text-white/80 font-plex text-sm">
            {[
              { href: "/docs", label: "Docs" },
              { href: "/support", label: "Support" },
              { href: "/privacy", label: "Privacy" },
              { href: "/contact", label: "Contact" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-brand-orange transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul> */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
