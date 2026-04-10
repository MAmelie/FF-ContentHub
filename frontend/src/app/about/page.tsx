/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FaUser } from "react-icons/fa";
import { getAboutPage } from "../../../lib/api";
import type { AboutPage, TeamGroup } from "../../../lib/types";
import Loader from "../../components/Loader";
import BackToHome from "../../components/BackToHome";

const GROUP_LABELS: Record<TeamGroup, string> = {
  founding: "Founding Team",
  core: "Core Team",
  advisory: "Advisory Team",
  operations: "Operations Team",
};

const GROUP_ORDER: TeamGroup[] = ["founding", "core", "advisory", "operations"];

const AboutPageRoute = () => {
  const [about, setAbout] = useState<AboutPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const data = await getAboutPage();
        if (data && data.publishedAt) {
          setAbout(data);
        } else {
          setError("About Us content is not yet published.");
        }
      } catch (err) {
        console.error("Error fetching About Us content:", err);
        setError("Failed to load About Us content.");
      } finally {
        setLoading(false);
      }
    };

    fetchAbout();
  }, []);

  const groupedMembers = useMemo(() => {
    const groups: Record<TeamGroup, NonNullable<AboutPage["team_members"]>> = {
      founding: [],
      core: [],
      advisory: [],
      operations: [],
    };

    for (const member of about?.team_members ?? []) {
      const group = member.team_group ?? "operations";
      groups[group].push(member);
    }
    return groups;
  }, [about]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-red-500 text-lg font-plex">{error}</p>
      </div>
    );
  }

  if (!about) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-subtitle text-lg font-plex">No About Us content found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="max-w-6xl mx-auto px-6 pt-8 pb-3 card-animate-in">
        <BackToHome label="Member Portal" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px] md:items-start">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-brand-blue font-didot">
              {about.title || "About Us"}
            </h1>
            {about.subtitle && (
              <p className="mt-2 text-base md:text-lg text-subtitle font-plex">
                {about.subtitle}
              </p>
            )}
            {about.intro && (
              <div
                className="mt-4 text-base text-subtitle font-plex leading-relaxed"
                dangerouslySetInnerHTML={{ __html: about.intro }}
              />
            )}
          </div>

          {about.hero_image?.url ? (
            <img
              src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${about.hero_image.url}`}
              alt={about.hero_image.alternativeText || about.title || "About Us"}
              className="w-full h-56 md:h-48 rounded-xl object-cover border border-card shadow-sm"
            />
          ) : null}
        </div>
        <div className="gradient-divider mt-6 mb-4" />
        {about.mission && (
          <div
            className="text-base text-subtitle font-plex leading-relaxed"
            dangerouslySetInnerHTML={{ __html: about.mission }}
          />
        )}
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
        {GROUP_ORDER.map((groupKey) => {
          const members = groupedMembers[groupKey];
          if (!members || members.length === 0) return null;

          return (
            <div key={groupKey} className="mb-10">
              <h2 className="text-xl md:text-2xl font-semibold text-brand-blue font-didot mb-4">
                {GROUP_LABELS[groupKey]}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((member, idx) => (
                  <article
                    key={member.id}
                    className="rounded-xl bg-white border border-card shadow-sm overflow-hidden card-animate-in"
                    style={{ "--delay": `${idx * 70}ms` } as React.CSSProperties}
                  >
                    {member.photo?.url ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${member.photo.url}`}
                        alt={member.photo.alternativeText || member.name}
                        className="h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="h-56 w-full bg-secondary-blue flex items-center justify-center">
                        <FaUser className="text-white/30 text-6xl" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-brand-blue font-didot">
                        {member.name}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-brand-orange font-plex">
                        {member.role}
                      </p>
                      {member.bio && (
                        <div
                          className="mt-3 text-sm text-subtitle leading-relaxed font-plex"
                          dangerouslySetInnerHTML={{ __html: member.bio }}
                        />
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default AboutPageRoute;
