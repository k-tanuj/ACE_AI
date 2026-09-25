// app/organizer/events/page.tsx — Organizer Events List
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase, Plus, Calendar, MapPin, ShieldCheck, Clock, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function OrganizerEventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const organizer = await prisma.organizer.findFirst({
    where: { userId: session.user.id },
  });

  const events = organizer
    ? await prisma.event.findMany({
        where: { organizerId: organizer.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary-600" />
            My Event Listings
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage your created events, track AI quality verification statuses, and view participant reach.
          </p>
        </div>
        <Link href="/organizer/events/new">
          <Button className="gap-2 bg-primary-600 hover:bg-primary-700">
            <Plus className="w-4 h-4" /> Create New Event
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <Card className="p-12 text-center space-y-4 border border-dashed border-border">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-text-primary">No events created yet</h3>
              <p className="text-text-muted text-sm mt-1">
                Start publishing student opportunities with instant AI assistance and quality verification.
              </p>
            </div>
            <Link href="/organizer/events/new">
              <Button size="sm" className="gap-2 bg-primary-600 hover:bg-primary-700">
                <Plus className="w-4 h-4" /> Create Your First Event
              </Button>
            </Link>
          </Card>
        ) : (
          events.map((evt) => {
            const status = evt.status.toLowerCase();
            const statusColor =
              status === "approved"
                ? "bg-success/10 text-success border-success/20"
                : status === "pending"
                ? "bg-warning/10 text-warning border-warning/20"
                : "bg-danger/10 text-danger border-danger/20";

            return (
              <Card key={evt.id} className="border border-border hover:shadow-sm transition-shadow">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColor}>
                        {status === "approved" ? (
                          <ShieldCheck className="w-3 h-3 mr-1 inline" />
                        ) : status === "pending" ? (
                          <Clock className="w-3 h-3 mr-1 inline" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 mr-1 inline" />
                        )}
                        {evt.status}
                      </Badge>
                      <Badge variant="outline">{evt.type}</Badge>
                      <span className="text-xs text-text-muted font-medium ml-auto md:ml-0">
                        EQS: <strong className="text-text-primary">{evt.qualityScore.toFixed(1)}</strong> / 100
                      </span>
                    </div>

                    <h3 className="font-semibold text-base text-text-primary">{evt.title}</h3>
                    <p className="text-xs text-text-muted line-clamp-1">{evt.description}</p>

                    <div className="flex items-center gap-4 text-xs text-text-muted pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary-500" />
                        {evt.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-warning" />
                        Deadline: {new Date(evt.registrationDeadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-2 shrink-0">
                    <Link
                      href={`/organizer/events/${evt.id}/edit`}
                      className="w-full md:w-auto px-4 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-surface-hover transition-colors text-center"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/events/${evt.slug || evt.id}`}
                      className="w-full md:w-auto px-4 py-2 rounded-lg bg-primary-50 text-primary-700 text-xs font-semibold hover:bg-primary-100 transition-colors text-center"
                    >
                      Preview
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
