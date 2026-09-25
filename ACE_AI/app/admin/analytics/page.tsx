// app/admin/analytics/page.tsx — Platform Trust & Moderation Analytics
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BarChart3, TrendingUp, ShieldCheck, AlertTriangle, Users, FileText, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [totalEvents, totalOrgs, totalUsers] = await Promise.all([
    prisma.event.count(),
    prisma.organizer.count(),
    prisma.user.count(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-600" />
          Platform Trust & Moderation Analytics
        </h1>
        <p className="text-text-muted text-sm mt-1">
          System-wide performance, AI quality scan velocity, and credibility metrics.
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Students</p>
              <p className="text-2xl font-bold text-text-primary">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Events</p>
              <p className="text-2xl font-bold text-text-primary">{totalEvents}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-info/10 text-info">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Organizers</p>
              <p className="text-2xl font-bold text-text-primary">{totalOrgs}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Auto-Approval Rate</p>
              <p className="text-2xl font-bold text-text-primary">82.4%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Overview */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Trust Tier Distribution Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {[
              { label: "Verified Partner (85-100)", count: "42%", color: "bg-success" },
              { label: "Trusted (70-84)", count: "35%", color: "bg-primary-500" },
              { label: "Established (50-69)", count: "15%", color: "bg-info" },
              { label: "New / Caution (30-49)", count: "6%", color: "bg-warning" },
              { label: "High Risk (0-29)", count: "2%", color: "bg-danger" },
            ].map((tier, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface">
                <span className="text-text-primary font-medium">{tier.label}</span>
                <span className="font-bold">{tier.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
