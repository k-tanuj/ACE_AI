// app/admin/organizers/page.tsx — Organizer Trust & Credibility Directory
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Users, ShieldCheck, Award, Star, RefreshCw, AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminOrganizersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const organizers = await prisma.organizer.findMany({
    orderBy: { credibilityScore: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-600" />
          Organizer Credibility Directory
        </h1>
        <p className="text-text-muted text-sm mt-1">
          View continuous Organizer Credibility Scores (OCS), assigned trust tiers, and verifications.
        </p>
      </div>

      <div className="space-y-4">
        {organizers.length === 0 ? (
          <Card className="p-8 text-center text-text-muted">No organizers registered yet.</Card>
        ) : (
          organizers.map((org) => {
            const ocs = org.credibilityScore ?? 75.0;
            const status = org.verificationStatus;

            return (
              <Card key={org.id} className="border border-border">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary-50 text-primary-700 border-primary-200">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
                        {ocs >= 85 ? "Verified Partner" : ocs >= 70 ? "Trusted" : "Established"}
                      </Badge>
                      <Badge variant="outline">{status}</Badge>
                      <span className="text-xs text-text-muted">
                        OCS Score: <strong className="text-primary-700 font-bold text-sm">{ocs.toFixed(1)}</strong> / 100
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-text-primary">{org.name}</h3>
                    <p className="text-xs text-text-muted line-clamp-1">{org.description}</p>
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
