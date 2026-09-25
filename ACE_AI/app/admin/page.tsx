// app/admin/page.tsx — Admin overview
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Users, FileText, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const [usersCount, organizersCount, eventsCount, pendingEvents] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.organizer.count(),
    prisma.event.count(),
    prisma.event.findMany({
      where: { status: "PENDING" },
      include: { organizer: true },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-text-primary">Admin Overview</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: usersCount, icon: Users, color: "text-primary-600" },
          { label: "Organizers", value: organizersCount, icon: ShieldCheck, color: "text-success" },
          { label: "Total Events", value: eventsCount, icon: FileText, color: "text-info" },
          { label: "Pending Review", value: pendingEvents.length, icon: AlertTriangle, color: "text-warning" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center">
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-text-primary">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Events */}
      <Card>
        <CardHeader>
          <CardTitle>Needs Review</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingEvents.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-sm">All caught up! No events pending review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/50">
                    <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Event</th>
                    <th className="text-left text-xs font-medium text-text-muted px-3 py-3">Organizer</th>
                    <th className="text-left text-xs font-medium text-text-muted px-3 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-text-muted px-3 py-3">Date Added</th>
                    <th className="text-right text-xs font-medium text-text-muted px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEvents.map((event) => (
                    <tr key={event.id} className="border-b border-border last:border-0 hover:bg-surface-muted/30">
                      <td className="px-5 py-3">
                        <Link href={`/events/${event.slug}`} className="text-sm font-medium text-primary-600 hover:underline">
                          {event.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-sm text-text-secondary">{event.organizer.name}</td>
                      <td className="px-3 py-3"><Badge variant="default" className="text-[10px]">{EVENT_TYPE_LABELS[event.type] || event.type}</Badge></td>
                      <td className="px-3 py-3 text-xs text-text-muted">{formatDate(event.createdAt)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/admin/events/${event.id}`} className="text-xs px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
