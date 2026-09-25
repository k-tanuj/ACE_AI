// app/(public)/events/page.tsx — Public events listing
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { Badge } from "@/components/ui/badge";
import { Zap, Search } from "lucide-react";

const EVENT_TYPES = ["HACKATHON", "COMPETITION", "WORKSHOP", "INTERNSHIP", "CONFERENCE", "SCHOLARSHIP", "CERTIFICATION", "RESEARCH"];

export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: { type?: string; remote?: string; page?: string } }) {
  const type = searchParams.type;
  const remote = searchParams.remote === "true";
  const page = parseInt(searchParams.page ?? "1");
  const limit = 12;

  const where = {
    status: "APPROVED" as const,
    registrationDeadline: { gte: new Date() },
    ...(type ? { type: type as never } : {}),
    ...(remote ? { isRemote: true } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { organizer: true },
      orderBy: [{ qualityScore: "desc" }, { registrationDeadline: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-surface/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-white" /></div>
            <span className="font-bold text-text-primary">ACE AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/search" className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all">
              <Search className="w-3.5 h-3.5" /> Smart Search
            </Link>
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-xl transition-all">Sign in</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Explore Opportunities</h1>
          <p className="text-text-secondary text-sm">{total} verified events — sign in for personalized recommendations</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/events" className={`text-sm px-3.5 py-2 rounded-xl font-medium transition-all ${!type && !remote ? "bg-primary-500 text-white" : "bg-surface border border-border text-text-secondary hover:border-primary-300"}`}>All</Link>
          {EVENT_TYPES.map((t) => (
            <Link key={t} href={`/events?type=${t}`} className={`text-sm px-3.5 py-2 rounded-xl font-medium transition-all ${type === t ? "bg-primary-500 text-white" : "bg-surface border border-border text-text-secondary hover:border-primary-300"}`}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </Link>
          ))}
          <Link href={`/events${type ? `?type=${type}&` : "?"}remote=true`} className={`text-sm px-3.5 py-2 rounded-xl font-medium transition-all ${remote ? "bg-success text-white" : "bg-surface border border-border text-text-secondary hover:border-primary-300"}`}>
            Remote Only
          </Link>
        </div>

        {/* Grid */}
        {events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-text-primary">No events found</p>
            <p className="text-text-muted text-sm mt-2">Try removing filters or check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={{ ...event, organizer: event.organizer ? { name: event.organizer.name, credibilityScore: event.organizer.credibilityScore, verificationStatus: event.organizer.verificationStatus } : null }}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && <Link href={`/events?${type ? `type=${type}&` : ""}page=${page - 1}`} className="px-4 py-2 rounded-xl border border-border text-sm text-text-secondary hover:bg-surface-muted transition-all">Previous</Link>}
            {page * limit < total && <Link href={`/events?${type ? `type=${type}&` : ""}page=${page + 1}`} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-all">Next</Link>}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 text-center p-8 bg-surface rounded-3xl border border-border">
          <p className="text-lg font-semibold text-text-primary mb-2">Get AI-powered recommendations</p>
          <p className="text-text-muted text-sm mb-4">Sign in to see opportunities matched to your skills and interests.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-primary-600 transition-all">Create Account — It&apos;s Free</Link>
        </div>
      </div>
    </div>
  );
}
