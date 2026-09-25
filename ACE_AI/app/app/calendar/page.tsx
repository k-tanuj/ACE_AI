// app/app/calendar/page.tsx — Deadline Calendar (user's saved events + featured upcoming)
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Calendar as CalendarIcon, Clock, MapPin, Bookmark, Star, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  // Primary: user's saved events ordered by deadline
  const savedEvents = await prisma.savedEvent.findMany({
    where: { userId },
    include: {
      event: {
        include: { organizer: { select: { name: true, credibilityScore: true } } },
      },
    },
    orderBy: { event: { registrationDeadline: "asc" } },
  });

  // Secondary: top featured events the user has NOT already saved (filler when saved list is small)
  const savedEventIds = new Set(savedEvents.map((s) => s.event.id));
  const featuredEvents = savedEvents.length < 5
    ? await prisma.event.findMany({
        where: {
          status: "APPROVED",
          registrationDeadline: { gte: new Date() },
          id: { notIn: Array.from(savedEventIds) },
        },
        include: { organizer: { select: { name: true, credibilityScore: true } } },
        orderBy: [{ qualityScore: "desc" }, { registrationDeadline: "asc" }],
        take: 10 - savedEvents.length,
      })
    : [];

  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary-600" />
            Deadline Calendar
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Your bookmarked events and featured upcoming deadlines, sorted by closest first.
          </p>
        </div>
      </div>

      {/* Saved events section */}
      {savedEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-text-primary">
              Your Saved Events ({savedEvents.length})
            </h2>
          </div>
          {savedEvents.map(({ event: evt }) => {
            const deadline = new Date(evt.registrationDeadline);
            const isClosingSoon = deadline.getTime() - now < THREE_DAYS;
            const isPast = deadline.getTime() < now;

            return (
              <Card
                key={evt.id}
                className="border border-border hover:border-primary-300 transition-colors"
              >
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{evt.type}</Badge>
                      <Badge className="bg-primary-50 text-primary-700 border-primary-200 text-[10px]">
                        <Bookmark className="w-2.5 h-2.5 mr-1 inline" /> Saved
                      </Badge>
                      {isClosingSoon && !isPast && (
                        <Badge className="bg-danger/10 text-danger border-danger/20">
                          <Clock className="w-3 h-3 mr-1 inline" /> Closing Soon
                        </Badge>
                      )}
                      {isPast && (
                        <Badge className="bg-surface-muted text-text-muted border-border">Deadline Passed</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-base text-text-primary">{evt.title}</h3>
                    <p className="text-xs text-text-muted line-clamp-1">{evt.description}</p>
                    <div className="flex items-center gap-4 text-xs text-text-muted pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary-500" />
                        {evt.isRemote ? "Remote / Online" : evt.location || "TBA"}
                      </span>
                      <span className={`flex items-center gap-1 font-medium ${isPast ? "text-text-muted" : "text-text-primary"}`}>
                        <Clock className={`w-3.5 h-3.5 ${isClosingSoon && !isPast ? "text-danger" : "text-warning"}`} />
                        Deadline: {deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-warning" />
                        Quality: {evt.qualityScore}%
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={`/events/${evt.slug}`}
                      className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      View Event <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Featured events filler */}
      {featuredEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold text-text-primary">
              Featured Upcoming Deadlines
            </h2>
            <span className="text-xs text-text-muted">— Save events to track them here</span>
          </div>
          {featuredEvents.map((evt) => {
            const deadline = new Date(evt.registrationDeadline);
            const isClosingSoon = deadline.getTime() - now < THREE_DAYS;

            return (
              <Card key={evt.id} className="border border-border/60 hover:border-primary-200 transition-colors opacity-80 hover:opacity-100">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{evt.type}</Badge>
                      {isClosingSoon && (
                        <Badge className="bg-danger/10 text-danger border-danger/20">
                          <Clock className="w-3 h-3 mr-1 inline" /> Closing Soon
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-base text-text-primary">{evt.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-text-muted pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary-500" />
                        {evt.isRemote ? "Remote / Online" : evt.location || "TBA"}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-text-primary">
                        <Clock className={`w-3.5 h-3.5 ${isClosingSoon ? "text-danger" : "text-warning"}`} />
                        Deadline: {deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={`/events/${evt.slug}`}
                      className="px-4 py-2 rounded-lg border border-border hover:border-primary-300 text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      View Event <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {savedEvents.length === 0 && featuredEvents.length === 0 && (
        <Card className="p-12 text-center border border-dashed border-border">
          <CalendarIcon className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="font-semibold text-text-primary mb-1">No events in your calendar yet</p>
          <p className="text-sm text-text-muted mb-4">Save events from the Discover page to track their deadlines here.</p>
          <Link
            href="/app/discover"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
          >
            Discover Events <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Card>
      )}
    </div>
  );
}
