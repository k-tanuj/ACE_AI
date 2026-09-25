// lib/utils.ts — Shared utilities (Tailwind + helpers)

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes cleanly */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Parse JSON stored in SQLite string columns */
export function parseJson<T = unknown>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Format a date as "Jan 12, 2026" */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

/** Days until a date */
export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Deadline label */
export function deadlineLabel(date: Date | string | null | undefined): string {
  const d = daysUntil(date);
  if (d === null) return "No deadline";
  if (d < 0) return "Closed";
  if (d === 0) return "Closes today";
  if (d === 1) return "Closes tomorrow";
  if (d <= 7) return `${d} days left`;
  return `Closes ${formatDate(date)}`;
}

/** Event type label */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  HACKATHON: "Hackathon",
  COMPETITION: "Competition",
  WORKSHOP: "Workshop",
  INTERNSHIP: "Internship",
  CONFERENCE: "Conference",
  SCHOLARSHIP: "Scholarship",
  CERTIFICATION: "Certification",
  RESEARCH: "Research",
  OTHER: "Other",
};

/** Status label + color */
export const EVENT_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Approved", className: "bg-success/10 text-success" },
  PENDING: { label: "Under Review", className: "bg-warning/10 text-warning" },
  REJECTED: { label: "Rejected", className: "bg-danger/10 text-danger" },
  DRAFT: { label: "Draft", className: "bg-surface-muted text-text-muted" },
  NEEDS_CHANGES: { label: "Needs Changes", className: "bg-info/10 text-info" },
  DUPLICATE: { label: "Duplicate", className: "bg-text-muted/10 text-text-muted" },
};

/** Quality score color */
export function qualityColor(score: number): string {
  if (score >= 85) return "text-success";
  if (score >= 65) return "text-warning";
  return "text-danger";
}

/** XP needed for next level */
export function xpForLevel(level: number): number {
  return level * 200;
}

/** Level name */
export const LEVEL_NAMES: Record<number, string> = {
  1: "Explorer",
  2: "Opportunity Seeker",
  3: "Skill Builder",
  4: "Career Builder",
  5: "Opportunity Pro",
};
