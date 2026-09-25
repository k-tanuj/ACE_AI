// app/app/discover/page.tsx — Full Discover page with filters
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EventCard } from "@/components/events/EventCard";
import { computeRecommendation } from "@/lib/ai/recommendation";
import Link from "next/link";
import { cn, EVENT_TYPE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EVENT_TYPES = Object.entries(EVENT_TYPE_LABELS);

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { type?: string; remote?: string; sort?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const type = searchParams.type;
  const remote = searchParams.remote === "true";
  const sort = searchParams.sort ?? "recommended";

  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });

  const where = {
    status: "APPROVED" as const,
    registrationDeadline: { gte: new Date() },
    ...(type ? { type: type as never } : {}),
    ...(remote ? { isRemote: true } : {}),
  };

  const events = await prisma.event.findMany({
    where,
    include: { organizer: true },
    take: 50,
  });

  const [savedEventIds] = await Promise.all([
    prisma.savedEvent.findMany({ where: { userId: session.user.id }, select: { eventId: true } }),
  ]);
  const savedSet = new Set(savedEventIds.map((s) => s.eventId));

  const scored = events.map((event) => {
    if (!profile) return { ...event, matchScore: event.qualityScore, matchReasons: [] as string[] };
    const rec = computeRecommendation(profile, event);
    return { ...event, matchScore: rec.score, matchReasons: rec.reasons };
  });

  if (sort === "recommended") scored.sort((a, b) => b.matchScore - a.matchScore);
  else if (sort === "quality") scored.sort((a, b) => b.qualityScore - a.qualityScore);
  else if (sort === "deadline") scored.sort((a, b) => new Date(a.registrationDeadline).getTime() - new Date(b.registrationDeadline).getTime());

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Discover Opportunities</h1>
          <p className="text-sm text-text-muted mt-1">{scored.length} events {profile ? "— ranked by AI match" : ""}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Type filter */}
        <Link href={`/app/discover${remote ? "?remote=true" : ""}`} className={cn("text-sm px-3.5 py-2 rounded-xl font-medium transition-all", !type ? "bg-primary-500 text-white" : "bg-surface border border-border text-text-secondary hover:border-primary-300")}>All</Link>
        {EVENT_TYPES.map(([key, label]) => (
          <Link key={key} href={`/app/discover?type=${key}${remote ? "&remote=true" : ""}`} className={cn("text-sm px-3.5 py-2 rounded-xl font-medium transition-all", type === key ? "bg-primary-500 text-white" : "bg-surface border border-border text-text-secondary hover:border-primary-300")}>
            {label}
          </Link>
        ))}
        <Link href={`/app/discover?${type ? `type=${type}&` : ""}remote=true`} className={cn("text-sm px-3.5 py-2 rounded-xl font-medium transition-all", remote ? "bg-success text-white" : "bg-surface border border-border text-text-secondary hover:border-primary-300")}>
          Remote
        </Link>
      </div>

      {/* Sort */}
      <div className="flex gap-2 mb-5 text-xs">
        <span className="text-text-muted py-1.5">Sort by:</span>
        {[
          { key: "recommended", label: "AI Recommended" },
          { key: "quality", label: "Quality Score" },
          { key: "deadline", label: "Deadline" },
        ].map((s) => (
          <Link key={s.key} href={`/app/discover?${type ? `type=${type}&` : ""}${remote ? "remote=true&" : ""}sort=${s.key}`} className={cn("px-3 py-1.5 rounded-lg font-medium transition-all", sort === s.key ? "bg-primary-100 text-primary-700" : "text-text-muted hover:text-text-primary")}>
            {s.label}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {scored.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-lg font-semibold text-text-primary">No events found</p>
          <p className="text-sm mt-2">Try different filters or check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scored.map((event) => (
            <EventCard
              key={event.id}
              event={{ ...event, isSaved: savedSet.has(event.id), organizer: event.organizer ? { name: event.organizer.name, credibilityScore: event.organizer.credibilityScore, verificationStatus: event.organizer.verificationStatus } : null }}
              showMatchScore={!!profile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
