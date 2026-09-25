// app/organizer/analytics/page.tsx — Organizer Performance Analytics
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BarChart3, TrendingUp, Users, Eye, Star, ShieldCheck, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function OrganizerAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const organizer = await prisma.organizer.findFirst({
    where: { userId: session.user.id },
  });

  const ocs = organizer?.credibilityScore ?? 88.5;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-600" />
          Organizer Performance Analytics
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Monitor student engagement, registration conversions, and trust rating metrics.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Event Views</p>
              <p className="text-2xl font-bold text-text-primary">4,820</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Registrations</p>
              <p className="text-2xl font-bold text-text-primary">1,240</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Avg Rating</p>
              <p className="text-2xl font-bold text-text-primary">4.85 / 5</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-info/10 text-info">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted">OCS Trust Score</p>
              <p className="text-2xl font-bold text-text-primary">{ocs.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trust Status Card */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Organizer Trust Status</span>
            <Badge className="bg-success/10 text-success border-success/20">Verified Partner</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Organizer Credibility Score (OCS)</span>
              <span className="font-bold text-text-primary">{ocs.toFixed(1)} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-success rounded-full" style={{ width: `${ocs}%` }} />
            </div>
            <p className="text-xs text-text-muted pt-1">
              Your high credibility score enables automatic event approvals and premium placement in student recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
