// app/(public)/events/[slug]/page.tsx — Event Detail Page
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, ExternalLink, Shield, CheckCircle, AlertTriangle, Bookmark, Share2, Flag, Zap, Users, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EventCard } from "@/components/events/EventCard";
import { computeRecommendation } from "@/lib/ai/recommendation";
import { parseJson, formatDate, deadlineLabel, EVENT_TYPE_LABELS, qualityColor } from "@/lib/utils";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const session = await auth();

  const event = await prisma.event.findFirst({
    where: { OR: [{ slug: params.slug }, { id: params.slug }] },
    include: {
      organizer: { include: { user: { select: { email: true } } } },
      verification: true,
      _count: { select: { savedBy: true } },
    },
  });

  if (!event) notFound();

  // Check if user has saved this event
  let isSaved = false;
  let matchScore = 0;
  let matchReasons: string[] = [];

  if (session?.user) {
    const [saved, profile] = await Promise.all([
      prisma.savedEvent.findUnique({ where: { userId_eventId: { userId: session.user.id, eventId: event.id } } }),
      prisma.studentProfile.findUnique({ where: { userId: session.user.id } }),
    ]);
    isSaved = !!saved;
    if (profile) {
      const rec = computeRecommendation(profile, event);
      matchScore = rec.score;
      matchReasons = rec.reasons;
    }
  }

  // Similar events
  const similar = await prisma.event.findMany({
    where: { type: event.type, status: "APPROVED", id: { not: event.id }, registrationDeadline: { gte: new Date() } },
    include: { organizer: true },
    orderBy: { qualityScore: "desc" },
    take: 3,
  });

  const eligibility = parseJson<string[]>(event.eligibility, []);
  const skills = parseJson<string[]>(event.skills, []);
  const checks = parseJson<Record<string, number>>(event.verification?.checks ?? null, {});
  const riskFlags = parseJson<string[]>(event.verification?.riskFlags ?? null, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-surface/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-white" /></div>
            <span className="font-bold text-text-primary">ACE AI</span>
          </Link>
          <Link href="/events" className="text-sm text-text-muted hover:text-text-primary transition-colors">Events</Link>
          <span className="text-text-muted">/</span>
          <span className="text-sm text-text-primary font-medium truncate">{event.title}</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Main content */}
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-surface rounded-3xl border border-border shadow-card p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="default">{EVENT_TYPE_LABELS[event.type] || event.type}</Badge>
                {event.status !== "APPROVED" && (
                  <Badge variant="warning" className="capitalize">
                    Status: {event.status.toLowerCase().replace("_", " ")}
                  </Badge>
                )}
                {event.isRemote && <Badge variant="info">Remote</Badge>}
                {event.organizer?.verificationStatus === "VERIFIED" && <Badge variant="success">Verified Organizer</Badge>}
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-3">{event.title}</h1>
              <p className="text-text-secondary text-sm mb-4">{event.shortSummary || event.description.slice(0, 150) + "..."}</p>

              <div className="flex flex-wrap gap-4 text-sm text-text-muted mb-5">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{event.isRemote ? "Remote" : event.location}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(event.startAt)}</span>
                <span className="flex items-center gap-1.5 text-danger font-medium"><Clock className="w-4 h-4" />Closes {deadlineLabel(event.registrationDeadline)}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{event._count.savedBy} saved</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="lg" className="rounded-2xl" asChild>
                  <a href={event.registrationUrl || "#"} target="_blank" rel="noopener noreferrer">
                    Register Now <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="secondary" size="lg" className="rounded-2xl">
                  <Bookmark className={isSaved ? "w-4 h-4 fill-primary-600" : "w-4 h-4"} />
                  {isSaved ? "Saved" : "Save"}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* AI Match (only for logged-in students) */}
            {session && matchScore > 0 && (
              <Card className="border-primary-100 bg-primary-50/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2 font-semibold text-primary-700"><Star className="w-4.5 h-4.5" />AI Match Score</span>
                    <span className="text-2xl font-bold text-primary-700">{matchScore}%</span>
                  </div>
                  <Progress value={matchScore} className="mb-3" />
                  <div className="space-y-1.5">
                    {matchReasons.map((r, i) => (
                      <p key={i} className="text-sm text-primary-600 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 shrink-0" />{r}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* About */}
            <Card>
              <CardHeader><CardTitle>About This Event</CardTitle></CardHeader>
              <CardContent>
                <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </CardContent>
            </Card>

            {/* Eligibility */}
            {eligibility.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Eligibility Requirements</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {eligibility.map((e, i) => <Badge key={i} variant="secondary">{e}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Required / Preferred Skills</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => <Badge key={i} variant="default">{s}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Similar events */}
            {similar.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-4">Similar Opportunities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {similar.slice(0, 2).map((e) => (
                    <EventCard key={e.id} event={{ ...e, organizer: e.organizer ? { name: e.organizer.name, credibilityScore: e.organizer.credibilityScore, verificationStatus: e.organizer.verificationStatus } : null }} compact />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Trust Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4.5 h-4.5 text-success" />
                  Event Trust Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Overall quality */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-secondary">Event Quality Score</span>
                  <span className={`text-lg font-bold ${qualityColor(event.qualityScore)}`}>{Math.round(event.qualityScore)}%</span>
                </div>
                <Progress value={event.qualityScore} indicatorClassName={event.qualityScore >= 80 ? "bg-success" : event.qualityScore >= 60 ? "bg-warning" : "bg-danger"} className="mb-3" />

                {/* Score breakdown */}
                {Object.entries(checks).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-text-muted capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    <span className={qualityColor(val as number)}>{Math.round(val as number)}%</span>
                  </div>
                ))}

                {/* Organizer credibility */}
                {event.organizer && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-secondary">Organizer Credibility</span>
                      <span className={`font-bold text-sm ${qualityColor(event.organizer.credibilityScore)}`}>{event.organizer.credibilityScore}%</span>
                    </div>
                    <Progress value={event.organizer.credibilityScore} />
                    <p className="text-xs text-text-muted mt-2">by {event.organizer.name}</p>
                  </div>
                )}

                {/* Risk flags */}
                {riskFlags.length > 0 ? (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-medium text-warning flex items-center gap-1 mb-2"><AlertTriangle className="w-3.5 h-3.5" />Flags detected</p>
                    {riskFlags.map((flag, i) => <p key={i} className="text-xs text-text-muted">• {flag}</p>)}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <CheckCircle className="w-4 h-4 text-success shrink-0" />
                    <span className="text-xs text-success font-medium">No risk flags detected</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick info */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Event Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: "Type", value: EVENT_TYPE_LABELS[event.type] },
                  { label: "Start Date", value: formatDate(event.startAt) },
                  { label: "Deadline", value: formatDate(event.registrationDeadline) },
                  { label: "Location", value: event.isRemote ? "Remote / Online" : event.location },
                  { label: "Organizer", value: event.organizer?.name ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-text-muted">{label}</span>
                    <span className="text-text-primary font-medium text-right max-w-[160px]">{value}</span>
                  </div>
                ))}
                <a href={event.registrationUrl || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary-600 hover:underline font-medium mt-1">
                  Registration Link <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </CardContent>
            </Card>

            {/* Report */}
            <button className="w-full flex items-center justify-center gap-2 text-xs text-text-muted hover:text-danger transition-colors py-2">
              <Flag className="w-3.5 h-3.5" />
              Report this event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
