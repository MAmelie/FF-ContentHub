/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FaUser } from "react-icons/fa";
import { getAboutPage } from "../../../lib/api";
import type { AboutPage, TeamGroup } from "../../../lib/types";
import Loader from "../../components/Loader";
import BackToHome from "../../components/BackToHome";

/** Section titles aligned with org PDF (Founders + Core Team brochure). */
const GROUP_LABELS: Record<TeamGroup, string> = {
  founding: "Founders",
  core: "Core Team",
  advisory: "Advisory",
  operations: "Operations",
};

/** Core / advisory / operations cards: photo band across top of card */
const TEAM_CARD_TOP_IMAGE =
  "w-full h-36 sm:h-40 md:h-44 object-cover rounded-lg shrink-0";

/** Core team brochure row: landscape photo, tight column */
const CORE_ROW_IMAGE =
  "w-full aspect-[4/3] object-cover rounded-lg shrink-0";

const FOUNDING_PHOTO =
  "h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 shrink-0 rounded-full object-cover border border-card/60 shadow-sm ring-2 ring-transparent ring-offset-2 ring-offset-gray-50 transition-[box-shadow] duration-200 ease-out group-hover:ring-[var(--brand-orange)]";

function FoundingMemberTile({
  member,
  delayMs,
}: {
  member: NonNullable<AboutPage["team_members"]>[number];
  delayMs: number;
}) {
  const photoUrl = member.photo?.url
    ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${member.photo.url}`
    : null;
  const linkedIn = member.linkedin_url?.trim();
  const nameClass =
    "text-sm sm:text-base font-semibold text-brand-blue font-didot text-center leading-tight max-w-[9rem] sm:max-w-[11rem] no-underline";
  const nameClassLinked = `${nameClass} transition-colors group-hover:text-brand-orange`;

  const style = { "--delay": `${delayMs}ms` } as React.CSSProperties;
  const groupLayout = "group flex flex-col items-center card-animate-in";

  const content = (
    <>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={linkedIn ? "" : member.photo?.alternativeText || member.name}
          className={FOUNDING_PHOTO}
        />
      ) : (
        <div
          className={`${FOUNDING_PHOTO} bg-secondary-blue/90 flex items-center justify-center`}
          aria-hidden
        >
          <FaUser className="text-white/40 text-5xl sm:text-6xl" />
        </div>
      )}
      <div className="mt-2 px-1">
        <span className={linkedIn ? nameClassLinked : nameClass}>{member.name}</span>
      </div>
    </>
  );

  if (linkedIn) {
    return (
      <a
        href={linkedIn}
        target="_blank"
        rel="noopener noreferrer"
        className={`${groupLayout} rounded-lg text-inherit no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50`}
        style={style}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={groupLayout} style={style}>
      {content}
    </div>
  );
}

function CoreTeamRowCard({
  member,
  delayMs,
}: {
  member: NonNullable<AboutPage["team_members"]>[number];
  delayMs: number;
}) {
  const photoUrl = member.photo?.url
    ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${member.photo.url}`
    : null;

  return (
    <article
      className="flex min-w-0 flex-col gap-2 min-h-0 card-animate-in"
      style={{ "--delay": `${delayMs}ms` } as React.CSSProperties}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={member.photo?.alternativeText || member.name}
          className={CORE_ROW_IMAGE}
        />
      ) : (
        <div
          className="w-full aspect-[4/3] rounded-lg shrink-0 bg-secondary-blue/90 flex items-center justify-center"
          aria-hidden
        >
          <FaUser className="text-white/40 text-3xl sm:text-4xl" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-brand-blue font-didot leading-tight">
        {member.name}
      </h3>
      <p className="text-xs text-subtitle font-plex italic leading-snug">
        {member.role}
      </p>
      {member.bio && (
        <div
          className="mt-0.5 text-[11px] sm:text-xs text-subtitle leading-relaxed font-plex [&_p]:mb-1.5 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: member.bio }}
        />
      )}
    </article>
  );
}

function TeamMemberCompactCard({
  member,
  delayMs,
}: {
  member: NonNullable<AboutPage["team_members"]>[number];
  delayMs: number;
}) {
  const photoUrl = member.photo?.url
    ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${member.photo.url}`
    : null;

  return (
    <article
      className="flex flex-col gap-3 rounded-lg bg-white border border-card/80 shadow-sm p-3 sm:p-4 md:p-4 card-animate-in hover:border-brand-blue/15 transition-colors overflow-hidden"
      style={{ "--delay": `${delayMs}ms` } as React.CSSProperties}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={member.photo?.alternativeText || member.name}
          className={TEAM_CARD_TOP_IMAGE}
        />
      ) : (
        <div
          className={`${TEAM_CARD_TOP_IMAGE} bg-secondary-blue/90 flex items-center justify-center`}
          aria-hidden
        >
          <FaUser className="text-white/40 text-3xl sm:text-4xl" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm sm:text-base font-semibold text-brand-blue font-didot leading-snug">
          {member.name}
        </h3>
        <p className="mt-0.5 text-[11px] sm:text-xs font-medium text-brand-orange font-plex leading-snug">
          {member.role}
        </p>
        {member.bio && (
          <div
            className="mt-2 text-xs sm:text-sm text-subtitle leading-relaxed font-plex [&_p]:mb-1.5 [&_p:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: member.bio }}
          />
        )}
      </div>
    </article>
  );
}

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
            <div
              key={groupKey}
              className={
                groupKey === "founding"
                  ? "mb-14 md:mb-18 lg:mb-20"
                  : "mb-8 md:mb-10"
              }
            >
              <header className="mb-3 md:mb-4">
                <h2 className="flex items-center gap-2.5 text-lg md:text-xl font-semibold font-didot text-brand-blue">
                  <span className="inline-block w-6 sm:w-8 h-0.5 sm:h-1 rounded-full bg-brand-orange shrink-0" />
                  {GROUP_LABELS[groupKey]}
                </h2>
              </header>
              {groupKey === "founding" ? (
                <div className="flex flex-wrap justify-center items-start gap-x-5 gap-y-6 sm:gap-x-7 md:gap-x-10">
                  {members.map((member, idx) => (
                    <FoundingMemberTile
                      key={member.id}
                      member={member}
                      delayMs={idx * 45}
                    />
                  ))}
                </div>
              ) : groupKey === "core" ? (
                <div className="w-full overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
                  <div
                    className="grid gap-3 sm:gap-4 w-full"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(members.length, 1)}, minmax(10rem, 1fr))`,
                    }}
                  >
                    {members.map((member, idx) => (
                      <CoreTeamRowCard
                        key={member.id}
                        member={member}
                        delayMs={idx * 45}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                  {members.map((member, idx) => (
                    <TeamMemberCompactCard
                      key={member.id}
                      member={member}
                      delayMs={idx * 45}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default AboutPageRoute;
