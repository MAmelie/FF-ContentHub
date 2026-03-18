"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLogo } from "../../../../lib/api";
import { Logo } from "../../../../lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

/** Fallback when Strapi is unreachable or logo media is missing. Add logo.png (or logo.svg) to frontend/public/. */
const FALLBACK_LOGO = "/logo.png";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const jwt = localStorage.getItem('jwt');
    if (jwt) {
      router.push('/home');
    }

    // Fetch logo from Strapi; fallback image is used if this fails or image errors
    const fetchLogo = async () => {
      try {
        const logoData = await getLogo();
        setLogo(logoData ?? null);
        setLogoLoadFailed(false);
      } catch (error) {
        console.error("Error fetching logo:", error);
      }
    };

    fetchLogo();
  }, [router]);

  const handleDiscordLogin = () => {
    if (!BACKEND_URL) {
      alert('Backend URL not configured. Please set NEXT_PUBLIC_STRAPI_URL.');
      return;
    }

    setIsLoading(true);
    // Redirect to Strapi's Discord authentication endpoint
    window.location.href = `${BACKEND_URL}/api/connect/discord`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Logo: Strapi when available; fallback to public/logo.png if Strapi fails or image errors */}
          <div className="flex justify-center mb-6">
            <img
              src={
                !logoLoadFailed &&
                logo?.logo?.[0]?.url &&
                process.env.NEXT_PUBLIC_STRAPI_URL
                  ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${logo.logo[0].url}`
                  : FALLBACK_LOGO
              }
              alt="FF Content Hub Logo"
              className="h-16 w-auto"
              onError={() => setLogoLoadFailed(true)}
            />
          </div>
          
          <h1 className="mb-2 text-2xl font-bold text-gray-900 font-didot">
            FF Member Portal
          </h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-didot">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 font-plex">
            Use Discord to authenticate with FF Member Portal
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <button
            onClick={handleDiscordLogin}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.120.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.210 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Continue with Discord
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}