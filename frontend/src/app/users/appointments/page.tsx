// app/users/appointments/page.tsx – My Appointments
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMyAppointments } from "../../../../lib/api";
import { isAuthenticated } from "../../../../lib/auth";
import type { Appointment } from "../../../../lib/types";
import Loader from "../../../components/Loader";
import BackToHome from "../../../components/BackToHome";
import LoginModal from "../../../components/LoginModal";
import { FaCalendarCheck, FaArrowLeft } from "react-icons/fa";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function expertName(expert: unknown): string {
  if (!expert || typeof expert !== "object") return "—";
  const name = (expert as { name?: string }).name;
  return name ?? "—";
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    requested: "Requested",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return labels[status] ?? status;
}

function statusClass(status: string): string {
  const classes: Record<string, string> = {
    requested: "bg-amber-100 text-amber-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-600",
    completed: "bg-blue-100 text-blue-800",
  };
  return classes[status] ?? "bg-gray-100 text-gray-700";
}

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const isLoggedIn = isAuthenticated();

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    const fetchAppointments = async () => {
      try {
        const data = await getMyAppointments();
        setAppointments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        setError("Failed to load your appointments");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-6 pt-6">
          <BackToHome />
        </div>
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-bold text-brand-blue font-didot mb-4">
            My appointments
          </h1>
          <p className="text-gray-700 font-plex mb-6">
            Log in to view and manage your expert session requests.
          </p>
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white font-plex hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
          >
            Log in
          </button>
        </div>
        <LoginModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-red-500 mb-4">{error}</p>
        <BackToHome />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <BackToHome />
      </div>
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <h1 className="text-2xl font-bold text-brand-blue font-didot mt-4 mb-6 flex items-center gap-2">
          <FaCalendarCheck /> My appointments
        </h1>

        {appointments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600 font-plex mb-4">
              You don’t have any appointment requests yet.
            </p>
            <Link
              href="/expert-net"
              className="inline-flex items-center gap-2 text-brand-blue hover:text-brand-orange font-plex text-sm font-medium"
            >
              <FaArrowLeft size={12} /> Browse experts
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {appointments.map((apt) => (
              <li
                key={apt.documentId ?? apt.id ?? JSON.stringify(apt)}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-didot font-semibold text-brand-blue">
                      {expertName(apt.expert)}
                    </h2>
                    <p className="text-sm text-gray-600 font-plex mt-1">
                      {formatDate(apt.preferred_date)}
                      {apt.preferred_time && (
                        <span className="ml-2 capitalize">
                          · {apt.preferred_time.replace(/_/g, " ")}
                        </span>
                      )}
                    </p>
                    {apt.message && (
                      <p className="text-sm text-gray-500 font-plex mt-2 italic">
                        {apt.message}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusClass(
                      apt.status
                    )}`}
                  >
                    {statusLabel(apt.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
