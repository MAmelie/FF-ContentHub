import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./onboarding.css";

export const metadata: Metadata = {
  title: "Member Onboarding | Feedforward",
  description: "Welcome to Feedforward — community onboarding and your first 90 days.",
};

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-onboarding-serif",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-onboarding-inter",
});

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${cormorant.variable} ${inter.variable}`}>
      {children}
    </div>
  );
}
