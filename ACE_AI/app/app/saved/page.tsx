// app/app/saved/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EventCard } from "@/components/events/EventCard";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const saved = await prisma.savedEvent.findMany({
    where: { userId: session.user.id },
    include: { event: { include: { organizer: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Saved Opportunities</h1>
          <p className="text-text-muted text-sm">{saved.length} saved event{saved.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/app/discover">Discover more</Link>
        </Button>
      </div>

      {saved.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-7 h-7 text-primary-600" />
          </div>
          <p className="text-lg font-semibold text-text-primary mb-2">No saved events yet</p>
          <p className="text-text-muted text-sm mb-5">Save events to track them and get deadline reminders.</p>
          <Button asChild><Link href="/app/discover">Explore Opportunities</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {saved.map(({ event }) => (
            <EventCard
              key={event.id}
              event={{ ...event, isSaved: true, organizer: event.organizer ? { name: event.organizer.name, credibilityScore: event.organizer.credibilityScore, verificationStatus: event.organizer.verificationStatus } : null }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
