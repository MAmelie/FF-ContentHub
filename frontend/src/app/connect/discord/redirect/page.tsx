"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuthData } from '../../../../../lib/auth';
import type { User } from '../../../../../lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_STRAPI_URL;
/** Canonical app URL (e.g. https://memberportal.feedforward.ai). If set, we redirect here after login so the URL bar always shows the desired domain. */
const CANONICAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || '';

function DiscordRedirectContent() {
  const [text, setText] = useState('Loading...');
  const [authFailed, setAuthFailed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        if (!BACKEND_URL) {
          throw new Error('Backend URL not configured');
        }

        // Get the search parameters from the URL
        const urlParams = searchParams.toString();
        
        // Make the callback request to Strapi
        const response = await fetch(
          `${BACKEND_URL}/api/auth/discord/callback?${urlParams}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        let data: { jwt?: string; user?: unknown; error?: { message?: string }; message?: string | string[] } = {};
        try {
          data = await response.json();
        } catch {
          /* non-JSON response */
        }

        if (!response.ok) {
          const msg =
            data?.error?.message ??
            (Array.isArray(data?.message) ? data.message[0] : data?.message) ??
            `Login failed (${response.status})`;
          throw new Error(typeof msg === 'string' ? msg : String(msg));
        }

        const jwt = data.jwt;
        if (!jwt) {
          throw new Error('Invalid login response: no token received');
        }

        // Successfully logged with Strapi
        // Save auth data in local storage and cookie for middleware checks.
        const rawUser = (data.user ?? {}) as Partial<User>;
        const authUser: User = {
          id: Number(rawUser.id ?? 0),
          username: rawUser.username ?? 'member',
          email: rawUser.email ?? '',
          confirmed: Boolean(rawUser.confirmed ?? true),
          blocked: Boolean(rawUser.blocked ?? false),
          createdAt: rawUser.createdAt ?? '',
          updatedAt: rawUser.updatedAt ?? '',
        };
        setAuthData(jwt, authUser);
        
        setText('You have been successfully logged in. You will be redirected in a few seconds...');
        
        // Redirect to personalized home after 3 seconds; use canonical URL so the bar shows the desired domain (e.g. memberportal.feedforward.ai)
        const redirectPath = '/home';
        setTimeout(() => {
          if (CANONICAL_APP_URL && typeof window !== 'undefined' && window.location.origin !== new URL(CANONICAL_APP_URL).origin) {
            window.location.href = `${CANONICAL_APP_URL}${redirectPath}`;
          } else {
            router.push(redirectPath);
          }
        }, 3000);

      } catch (error) {
        console.error('Authentication error:', error);
        setAuthFailed(true);
        const message = error instanceof Error ? error.message : 'An error occurred during authentication. Please try again.';
        setText(message);
        
        // Redirect to login page after 5 seconds on error
        const loginPath = '/auth/login';
        setTimeout(() => {
          if (CANONICAL_APP_URL && typeof window !== 'undefined' && window.location.origin !== new URL(CANONICAL_APP_URL).origin) {
            window.location.href = `${CANONICAL_APP_URL}${loginPath}`;
          } else {
            router.push(loginPath);
          }
        }, 5000);
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 font-didot">
            Authenticating...
          </h2>
          <p className="mt-2 text-sm text-gray-600 font-plex">{text}</p>
          
          {text.includes('Loading') && (
            <div className="mt-4 flex justify-center">
              <svg 
                className="animate-spin h-8 w-8 text-indigo-600" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
          
          {(authFailed || text.includes('error')) && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg 
                    className="h-5 w-5 text-red-400" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 font-didot">
                    Authentication Failed
                  </h3>
                  {authFailed && text && (
                    <p className="mt-1 text-sm text-red-700 font-plex">{text}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {text.includes('successfully') && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg 
                    className="h-5 w-5 text-green-400" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 font-didot">
                    Login Successful!
                  </h3>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 font-didot">Authenticating...</h2>
        <p className="mt-2 text-sm text-gray-600 font-plex">Loading...</p>
        <div className="mt-4 flex justify-center">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function DiscordRedirect() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DiscordRedirectContent />
    </Suspense>
  );
}