// components/events/EventCard.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, Bookmark, BookmarkCheck, ExternalLink, Star, Zap, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn, EVENT_TYPE_LABELS, deadlineLabel, qualityColor, formatDate } from "@/lib/utils";

export interface EventCardData {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  shortSummary?: string;
  location: string;
  isRemote: boolean;
  registrationDeadline: Date | string;
  qualityScore: number;
  bannerColor: string;
  registrationUrl?: string;
  organizer?: { name: string; credibilityScore: number; verificationStatus: string } | null;
  matchScore?: number;
  matchReasons?: string[];
  isSaved?: boolean;
}

interface EventCardProps {
  event: EventCardData;
  onSaveToggle?: (eventId: string, saved: boolean) => Promise<void>;
  showMatchScore?: boolean;
  compact?: boolean;
}

export function EventCard({ event, onSaveToggle, showMatchScore = false, compact = false }: EventCardProps) {
  const [saved, setSaved] = useState(event.isSaved ?? false);
  const [saving, setSaving] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<"UP" | "DOWN" | null>(null);

  async function handleFeedback(e: React.MouseEvent, type: "UP" | "DOWN") {
    e.preventDefault();
    e.stopPropagation();
    if (feedbackGiven) return;
    setFeedbackGiven(type);
    try {
      await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, feedback: type }),
      });
      toast({
        title: type === "UP" ? "Thanks for your feedback!" : "Preference recorded",
        description: type === "UP" ? "We will recommend more opportunities like this." : "We will show fewer events like this.",
        variant: "default",
      });
    } catch {
      // quiet
    }
  }

  const deadline = deadlineLabel(event.registrationDeadline);
  const isUrgent = (() => {
    const d = new Date(event.registrationDeadline);
    return (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 3;
  })();

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    const next = !saved;
    setSaved(next);
    try {
      await onSaveToggle?.(event.id, next);
      toast({
        title: next ? "Event saved" : "Event unsaved",
        description: next ? `"${event.title}" added to your saved list.` : `"${event.title}" removed from saved list.`,
        variant: next ? "success" : "default",
      });
    } catch {
      setSaved(!next);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        "group block bg-surface rounded-2xl border border-border/60 shadow-card",
        "hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200",
        compact ? "p-4" : "p-5"
      )}
    >
      {/* Header strip */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Color dot */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 opacity-90"
            style={{ backgroundColor: event.bannerColor + "20", border: `1.5px solid ${event.bannerColor}40` }}
          >
            <Zap className="w-4 h-4" style={{ color: event.bannerColor }} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <Badge variant="default" className="text-[10px] px-2 py-0 h-4.5">
                {EVENT_TYPE_LABELS[event.type] || event.type}
              </Badge>
              {event.organizer?.verificationStatus === "VERIFIED" && (
                <Badge variant="success" className="text-[10px] px-2 py-0 h-4.5">Verified</Badge>
              )}
            </div>
            <h3 className={cn("font-semibold text-text-primary group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug", compact ? "text-sm" : "text-[15px]")}>
              {event.title}
            </h3>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          aria-label={saved ? "Unsave event" : "Save event"}
          className="shrink-0 p-1.5 rounded-lg hover:bg-primary-100 transition-all duration-150 disabled:opacity-50"
        >
          {saved
            ? <BookmarkCheck className="w-4.5 h-4.5 text-primary-600" />
            : <Bookmark className="w-4.5 h-4.5 text-text-muted group-hover:text-primary-500" />
          }
        </button>
      </div>

      {/* Description */}
      {!compact && (
        <p className="text-sm text-text-secondary line-clamp-2 mb-3 leading-relaxed">
          {event.shortSummary || event.description}
        </p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mb-3">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {event.isRemote ? "Remote" : event.location || "Location TBD"}
        </span>
        <span className={cn("flex items-center gap-1", isUrgent ? "text-danger font-medium" : "")}>
          <Calendar className="w-3.5 h-3.5" />
          {deadline}
        </span>
      </div>

      {/* AI Match Score & Feedback Loop (SRD §8.3) */}
      {showMatchScore && event.matchScore !== undefined && (
        <div className="mb-3 p-2.5 rounded-xl bg-primary-100/50 border border-primary-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-primary-700 flex items-center gap-1">
              <Star className="w-3 h-3" />
              AI Match Score
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary-700">{event.matchScore}%</span>
              <div className="flex items-center gap-1 border-l border-primary-200/80 pl-2">
                <button
                  type="button"
                  title="Helpful match"
                  onClick={(e) => handleFeedback(e, "UP")}
                  className={cn(
                    "p-1 rounded hover:bg-primary-200/70 transition-colors",
                    feedbackGiven === "UP" ? "text-success font-bold" : "text-primary-600 hover:text-success"
                  )}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Not relevant"
                  onClick={(e) => handleFeedback(e, "DOWN")}
                  className={cn(
                    "p-1 rounded hover:bg-primary-200/70 transition-colors",
                    feedbackGiven === "DOWN" ? "text-danger font-bold" : "text-primary-600 hover:text-danger"
                  )}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          {event.matchReasons?.slice(0, 2).map((reason, i) => (
            <p key={i} className="text-[11px] text-primary-600 leading-relaxed">• {reason}</p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {event.organizer && (
            <span className="text-xs text-text-muted truncate max-w-[140px]">by {event.organizer.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Quality score */}
          <span className={cn("text-xs font-semibold", qualityColor(event.qualityScore))}>
            {Math.round(event.qualityScore)}% quality
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────
export function EventCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border/60 shadow-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-surface-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-muted rounded-lg animate-pulse w-1/3" />
          <div className="h-4 bg-surface-muted rounded-lg animate-pulse w-3/4" />
        </div>
      </div>
      <div className="h-3 bg-surface-muted rounded animate-pulse" />
      <div className="h-3 bg-surface-muted rounded animate-pulse w-4/5" />
      <div className="flex gap-3">
        <div className="h-3 bg-surface-muted rounded animate-pulse w-20" />
        <div className="h-3 bg-surface-muted rounded animate-pulse w-24" />
      </div>
    </div>
  );
}
