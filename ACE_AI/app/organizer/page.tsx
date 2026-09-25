// app/organizer/page.tsx — Organizer dashboard overview
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, CheckCircle, Clock, XCircle, AlertTriangle, BarChart3, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EVENT_TYPE_LABELS, formatDate, qualityColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; variant: "success" | "warning" | "danger" | "secondary" | "info" }> = {
  APPROVED: { label: "Approved", icon: CheckCircle, variant: "success" },
  PENDING: { label: "Under Review", icon: Clock, variant: "warning" },
  REJECTED: { label: "Rejected", icon: XCircle, variant: "danger" },
  NEEDS_CHANGES: { label: "Needs Changes", icon: AlertTriangle, variant: "info" },
  DRAFT: { label: "Draft", icon: Clock, variant: "secondary" },
};

export default async function OrganizerDashboard() {
  const session = await auth();
  if (!session?.user || !["ORGANIZER", "ADMIN"].includes(session.user.role)) redirect("/login");

  const organizer = await prisma.organizer.findUnique({
    where: { userId: session.user.id },
    include: { events: { include: { _count: { select: { savedBy: true, activity: true } } }, orderBy: { createdAt: "desc" } } },
  });

  if (!organizer) redirect("/organizer/onboarding");

  const events = organizer.events;
  const totalSaves = events.reduce((acc, e) => acc + e._count.savedBy, 0);
  const totalActivity = events.reduce((acc, e) => acc + e._count.activity, 0);
  const approvedCount = events.filter((e) => e.status === "APPROVED").length;
  const pendingCount = events.filter((e) => e.status === "PENDING").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome, {organizer.name}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {organizer.verificationStatus === "VERIFIED"
              ? <span className="text-success font-medium flex items-center gap-1 mt-1"><CheckCircle className="w-3.5 h-3.5" />Verified Organizer</span>
              : <span className="text-warning">Verification pending</span>}
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/events/new"><Plus className="w-4 h-4" />Create Event</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: events.length, color: "text-primary-600" },
          { label: "Approved", value: approvedCount, color: "text-success" },
          { label: "Under Review", value: pendingCount, color: "text-warning" },
          { label: "Total Saves", value: totalSaves, color: "text-info" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-xs text-text-muted mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Credibility */}
      <Card className="border-primary-100 bg-primary-50/30">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Credibility Score</p>
              <p className={`text-3xl font-bold mt-1 ${qualityColor(organizer.credibilityScore)}`}>{organizer.credibilityScore}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Factors: verified organizer, event quality, community trust</p>
              <p className="text-xs text-primary-600 mt-1">Improve by completing your profile and posting high-quality events</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-muted text-sm mb-4">No events posted yet.</p>
              <Button asChild><Link href="/organizer/events/new"><Plus className="w-4 h-4" />Post Your First Event</Link></Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Event</th>
                    <th className="text-left text-xs font-medium text-text-muted px-3 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-text-muted px-3 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-text-muted px-3 py-3">Quality</th>
                    <th className="text-left text-xs font-medium text-text-muted px-3 py-3">Saves</th>
                    <th className="text-left text-xs font-medium text-text-muted px-3 py-3">Deadline</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const status = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.DRAFT;
                    return (
                      <tr key={event.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-text-primary truncate max-w-[220px]">{event.title}</p>
                        </td>
                        <td className="px-3 py-3"><Badge variant="secondary" className="text-[10px]">{EVENT_TYPE_LABELS[event.type] || event.type}</Badge></td>
                        <td className="px-3 py-3"><Badge variant={status.variant} className="text-[10px] flex items-center gap-1"><status.icon className="w-3 h-3" />{status.label}</Badge></td>
                        <td className="px-3 py-3"><span className={cn("text-sm font-semibold", qualityColor(event.qualityScore))}>{Math.round(event.qualityScore)}%</span></td>
                        <td className="px-3 py-3 text-sm text-text-muted">{event._count.savedBy}</td>
                        <td className="px-3 py-3 text-sm text-text-muted">{formatDate(event.registrationDeadline)}</td>
                        <td className="px-3 py-3">
                          <Link href={`/events/${event.slug}`} className="text-primary-600 hover:underline text-xs flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
