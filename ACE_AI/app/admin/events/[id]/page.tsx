import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Calendar, MapPin, User, ShieldCheck, AlertTriangle, Link as LinkIcon, Activity } from "lucide-react";
import Link from "next/link";

export default async function AdminEventDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      organizer: true,
      verification: true,
    },
  });

  if (!event) return notFound();

  const isApproved = event.status === "PUBLISHED" || event.status === "APPROVED";
  const isRejected = event.status === "REJECTED";

  const statusColor = isApproved
    ? "bg-success/10 text-success border-success/20"
    : isRejected
    ? "bg-danger/10 text-danger border-danger/20"
    : "bg-warning/10 text-warning border-warning/20";

  let riskFlags: string[] = [];
  try {
    if (event.verification?.riskFlags) {
      riskFlags = JSON.parse(event.verification.riskFlags as string);
    }
  } catch (e) {}

  let checks: Record<string, number> = {};
  try {
    if (event.verification?.checks) {
      checks = JSON.parse(event.verification.checks as string);
    }
  } catch (e) {}

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{event.type}</Badge>
            <Badge className={statusColor}>{event.status}</Badge>
            {event.qualityScore && (
              <Badge variant="secondary">EQS: {event.qualityScore.toFixed(1)}</Badge>
            )}
          </div>
        </div>
        <Link 
          href="/admin/events" 
          className="text-sm px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary hover:bg-surface-elevated/80 transition-colors"
        >
          &larr; Back to Events
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-text-secondary">{event.description}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-3 text-text-secondary">
                  <Calendar className="w-5 h-5 text-primary-500" />
                  <span>{new Date(event.startAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 text-text-secondary">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  <span>{event.location || (event.isRemote ? "Remote" : "TBD")}</span>
                </div>
                {event.registrationUrl && (
                  <div className="flex items-center gap-3 text-text-secondary sm:col-span-2">
                    <LinkIcon className="w-5 h-5 text-primary-500" />
                    <a href={event.registrationUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                      Registration Link
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {event.verification && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary-500" />
                  AI Verification Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(checks).map(([key, value]) => (
                    <div key={key} className="p-3 bg-surface border border-border rounded-lg text-center">
                      <div className="text-2xl font-bold text-text-primary">{Number(value).toFixed(0)}</div>
                      <div className="text-xs text-text-muted capitalize">{key.replace(/_/g, " ")}</div>
                    </div>
                  ))}
                </div>

                {riskFlags.length > 0 && (
                  <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
                    <h4 className="font-semibold text-danger flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Risk Flags Detected
                    </h4>
                    <ul className="list-disc list-inside text-sm text-danger/90 space-y-1">
                      {riskFlags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-500" />
                Organizer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-text-muted">Name</div>
                <div className="font-medium text-text-primary">{event.organizer.name}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Credibility Score (OCS)</div>
                <div className="font-medium text-text-primary flex items-center gap-2">
                  {event.organizer.credibilityScore} / 100
                  {event.organizer.credibilityScore >= 80 ? (
                    <Badge className="bg-success/10 text-success border-success/20">High Trust</Badge>
                  ) : event.organizer.credibilityScore >= 50 ? (
                    <Badge className="bg-primary-500/10 text-primary-600 border-primary-500/20">Verified</Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning/20">Caution</Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Verification Status</div>
                <div className="font-medium text-text-primary capitalize">{event.organizer.verificationStatus.toLowerCase()}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-surface-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-500" />
                Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-text-primary">{event.viewCount}</div>
                  <div className="text-xs text-text-muted">Views</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">{event.saveCount}</div>
                  <div className="text-xs text-text-muted">Saves</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">{event.clickCount}</div>
                  <div className="text-xs text-text-muted">Clicks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">{event.applicationCount}</div>
                  <div className="text-xs text-text-muted">Applications</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
