// app/admin/events/page.tsx — Admin Events Management Directory
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FileText, ShieldCheck, Clock, AlertTriangle, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { organizer: true },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary-600" />
          Platform Events Directory
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Monitor all published and pending events, quality scores, and verification flags across AllCollegeEvent.com.
        </p>
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <Card className="p-8 text-center text-text-muted">No events registered on platform.</Card>
        ) : (
          events.map((evt) => {
            const status = evt.status.toLowerCase();
            const statusBadge =
              status === "approved"
                ? "bg-success/10 text-success border-success/20"
                : status === "pending"
                ? "bg-warning/10 text-warning border-warning/20"
                : "bg-danger/10 text-danger border-danger/20";

            return (
              <Card key={evt.id} className="border border-border hover:shadow-xs transition-shadow">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusBadge}>{evt.status}</Badge>
                      <Badge variant="outline">{evt.type}</Badge>
                      <span className="text-xs text-text-muted ml-auto md:ml-0">
                        EQS: <strong className="text-text-primary">{evt.qualityScore.toFixed(1)}</strong>
                      </span>
                    </div>
                    <h3 className="font-semibold text-base text-text-primary">{evt.title}</h3>
                    <p className="text-xs text-text-muted">
                      Organizer: <strong className="text-text-primary">{evt.organizer.name}</strong> &bull; Location: {evt.location}
                    </p>
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
