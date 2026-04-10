// app/expert-net/[slug]/page.tsx – individual expert profile page (linkable)
"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { getExpertBySlug } from "../../../../lib/api";
import { ExpertBio } from "../../../../lib/types";
import {
  getAdvisoryTopicsForExpert,
  AdvisoryTopic,
} from "../../../../lib/expertAdvisoryTopics";
import Loader from "@/components/Loader";
import BackToHome from "@/components/BackToHome";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaUser, FaArrowLeft, FaCalendarCheck } from "react-icons/fa";

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-brand-blue mb-3 font-didot">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-brand-blue mb-2 font-didot">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-semibold text-brand-blue mb-2 font-didot">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-base font-semibold text-brand-blue mb-2 font-didot">
      {children}
    </h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-gray-700 leading-relaxed text-sm">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-gray-700 text-sm">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-brand-blue pl-3 italic text-gray-600 mb-3 bg-gray-50 py-2 text-sm">
      {children}
    </blockquote>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-gray-700">{children}</em>
  ),
  a: ({
    children,
    href,
  }: {
    children?: React.ReactNode;
    href?: string;
  }) => (
    <a
      href={href}
      className="text-brand-blue hover:text-brand-orange transition-colors underline text-sm"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

function AdvisoryTopicsSection({
  topics,
  richtext,
}: {
  topics: AdvisoryTopic[] | null;
  richtext?: string | null;
}) {
  if (richtext?.trim()) {
    return (
      <div className="prose prose-sm max-w-none text-gray-700 font-plex">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {richtext}
        </ReactMarkdown>
      </div>
    );
  }
  if (!topics?.length) return null;
  return (
    <div className="space-y-6">
      {topics.map((t, i) => (
        <div key={i} className="border-l-2 border-brand-orange pl-4">
          <h4 className="text-base font-semibold text-brand-blue mb-2 font-didot">
            {t.title}
          </h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm font-plex">
            {t.points.map((point, j) => (
              <li key={j}>{point}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function ExpertProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [expert, setExpert] = useState<ExpertBio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpert = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }
      try {
        const data = await getExpertBySlug(slug);
        setExpert(data);
      } catch (err) {
        console.error("Error fetching expert:", err);
        setError("Failed to load expert profile");
      } finally {
        setLoading(false);
      }
    };
    fetchExpert();
  }, [slug]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  if (!expert)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <p className="text-gray-600 mb-4">Expert not found.</p>
        <Link
          href="/expert-net"
          className="inline-flex items-center gap-2 text-brand-blue hover:text-brand-orange transition-colors font-plex text-sm font-medium"
        >
          <FaArrowLeft size={12} /> Back to Expert Network
        </Link>
      </div>
    );

  const advisoryTopics = getAdvisoryTopicsForExpert(
    expert.name,
    expert.advisory_topics
  );
  const hasAdvisoryContent =
    (expert.advisory_topics?.trim() ?? "") !== "" || (advisoryTopics?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <BackToHome label="Expert site" href="/expert-net" />
      </div>

      <article className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200/80">
          <div className="flex flex-col md:flex-row">
            {/* Left – Photo */}
            <div className="relative md:w-2/5 shrink-0 bg-brand-blue min-h-[240px] md:min-h-[320px]">
              {expert.photo?.url ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${expert.photo.url}`}
                  alt={expert.name}
                  className="w-full h-64 md:h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-full flex items-center justify-center">
                  <FaUser className="text-white/20 text-7xl" />
                </div>
              )}
            </div>

            {/* Right – Header + Bio */}
            <div className="flex-1 p-8 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-brand-blue font-didot leading-snug">
                    {expert.name}
                  </h1>
                  <p className="mt-2 text-sm font-medium text-brand-orange font-plex">
                    {expert.title}
                  </p>
                </div>
                {/* TODO: point to Calendly when ready */}
                <button
                  type="button"
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-medium text-white font-plex hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
                >
                  <FaCalendarCheck size={14} /> Book session
                </button>
              </div>
              <div className="mt-3 h-px w-12 bg-brand-orange/40" />

              <div className="mt-6 prose prose-sm max-w-none text-gray-700 font-plex">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {expert.bio}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {/* Focus areas / Example advisory session topics */}
        {hasAdvisoryContent && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-brand-blue font-didot mb-4">
              Focus Areas & Example Advisory Session Topics
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-8">
              <AdvisoryTopicsSection
                topics={advisoryTopics}
                richtext={expert.advisory_topics}
              />
            </div>
          </section>
        )}

        {/* Book a session — intake form hidden until Calendly; orange CTA above stays for future link */}
        {/*
        <section ref={bookSectionRef} id="book-session" className="mt-10 scroll-mt-6">
          <h2 className="text-xl font-bold text-brand-blue font-didot mb-4 flex items-center gap-2">
            <FaCalendarCheck /> Book a session
          </h2>
          {isLoggedIn ? (
            <BookingForm expert={expert} />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-gray-700 font-plex mb-4">
                Log in to request an appointment with {expert.name}.
              </p>
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white font-plex hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
              >
                Log in to request a session
              </button>
            </div>
          )}
        </section>
        */}

        <Link
          href="/expert-net"
          className="inline-flex items-center gap-2 text-brand-blue hover:text-brand-orange mt-8 transition-colors font-plex text-sm font-medium"
        >
          <FaArrowLeft size={12} /> Back to Expert Network
        </Link>
      </article>

    </div>
  );
}
