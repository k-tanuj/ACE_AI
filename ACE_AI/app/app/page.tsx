// app/app/page.tsx — Student Dashboard
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame, Bookmark, TrendingUp, Calendar, Target, ChevronRight, Star, Bell } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { computeRecommendation } from "@/lib/ai/recommendation";
import { parseJson, deadlineLabel, formatDate, xpForLevel, LEVEL_NAMES } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const [profile, gamification, savedEvents, notifications, upcomingDeadlines] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId } }),
    prisma.gamificationProfile.findUnique({ where: { userId } }),
    prisma.savedEvent.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.savedEvent.findMany({
      where: { userId },
      include: { event: { include: { organizer: true } } },
      orderBy: { event: { registrationDeadline: "asc" } },
      take: 3,
    }),
  ]);

  // Redirect to onboarding if not done
  if (profile && !profile.onboardingDone) {
    redirect("/app/onboarding");
  }

  // Get recommendations
  const events = await prisma.event.findMany({
    where: { status: "APPROVED", registrationDeadline: { gte: new Date() } },
    include: { organizer: true },
    take: 50,
  });

  let recommended = events.map((event) => {
    if (!profile) return { ...event, matchScore: event.qualityScore, matchReasons: ["Highly rated"] };
    const result = computeRecommendation(profile, event);
    return { ...event, matchScore: result.score, matchReasons: result.reasons };
  });
  recommended.sort((a, b) => b.matchScore - a.matchScore);
  const topRecommended = recommended.slice(0, 6);

  const xp = gamification?.xp ?? 0;
  const level = gamification?.level ?? 1;
  const streak = gamification?.currentStreak ?? 0;
  const nextLevelXp = xpForLevel(level);
  const xpProgress = Math.min(100, (xp / nextLevelXp) * 100);
  const levelName = LEVEL_NAMES[level] ?? "Explorer";

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* ── Hero / Summary ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary-900 to-primary-700 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-primary-300 text-sm mb-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
              <h1 className="text-2xl font-bold">{greeting}, {firstName}!</h1>
              <p className="text-primary-200 text-sm mt-1">Your opportunity feed is ready.</p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-2">
                <Flame className="w-4.5 h-4.5 text-orange-300" />
                <span className="text-sm font-semibold">{streak}-day streak</span>
              </div>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Recommended", value: topRecommended.length + "+", icon: Star, href: "/app/discover" },
              { label: "Saved", value: savedEvents, icon: Bookmark, href: "/app/saved" },
              { label: "Unread alerts", value: notifications, icon: Bell, href: "/app/notifications" },
              { label: "Your XP", value: `${xp} XP`, icon: TrendingUp, href: "/app/progress" },
            ].map((stat, i) => (
              <Link key={i} href={stat.href} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-3.5 transition-all duration-150 group">
                <div className="flex items-center gap-2 mb-1.5">
                  <stat.icon className="w-4 h-4 text-primary-300" />
                  <span className="text-xs text-primary-300">{stat.label}</span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </Link>
            ))}
          </div>

          {/* XP progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5 text-xs text-primary-300">
              <span>Level {level} — {levelName}</span>
              <span>{xp} / {nextLevelXp} XP to Level {level + 1}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white/70 transition-all duration-700" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Layout: Recommendations + Sidebar ────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main column */}
        <div className="space-y-6">
          {/* Recommended for You */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">Recommended for You</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/discover" className="flex items-center gap-1 text-primary-600">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topRecommended.map((event) => (
                <EventCard
                  key={event.id}
                  event={{ ...event, organizer: event.organizer ? { name: event.organizer.name, credibilityScore: event.organizer.credibilityScore, verificationStatus: event.organizer.verificationStatus } : null }}
                  showMatchScore
                />
              ))}
            </div>
          </section>

          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-text-primary mb-4">Upcoming Deadlines</h2>
              <Card>
                <CardContent className="p-4 divide-y divide-border">
                  {upcomingDeadlines.map(({ event }) => (
                    <Link key={event.id} href={`/events/${event.slug}`} className="flex items-center justify-between py-3 hover:bg-surface-muted -mx-4 px-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{event.title}</p>
                        <p className="text-xs text-text-muted">{event.organizer?.name}</p>
                      </div>
                      <Badge variant={(() => { const d = new Date(event.registrationDeadline); const days = (d.getTime() - Date.now()) / (1000*60*60*24); return days <= 3 ? "danger" : "warning"; })()}>
                        {deadlineLabel(event.registrationDeadline)}
                      </Badge>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Daily Challenge */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4.5 h-4.5 text-primary-600" />
                Daily Challenges
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[
                { title: "Explore 5 Opportunities", progress: 3, target: 5, xp: 50 },
                { title: "Save 3 Events", progress: 0, target: 3, xp: 30 },
              ].map((ch, i) => (
                <div key={i} className="p-3 bg-surface-muted rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">{ch.title}</span>
                    <Badge variant="default" className="text-[10px]">+{ch.xp} XP</Badge>
                  </div>
                  <Progress value={(ch.progress / ch.target) * 100} className="h-1.5 mb-1" />
                  <p className="text-xs text-text-muted">{ch.progress}/{ch.target} complete</p>
                </div>
              ))}
              <Button variant="secondary" size="sm" className="w-full" asChild>
                <Link href="/app/challenges">View all challenges</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 grid grid-cols-2 gap-2">
              {[
                { label: "Search Events", href: "/search", icon: "🔍" },
                { label: "ACE Chat", href: "/app/chat", icon: "💬" },
                { label: "My Progress", href: "/app/progress", icon: "📈" },
                { label: "Leaderboard", href: "/app/leaderboard", icon: "🏆" },
              ].map((q, i) => (
                <Link key={i} href={q.href} className="flex flex-col items-center gap-1.5 p-3 bg-surface-muted rounded-xl hover:bg-primary-100/50 transition-colors text-center group">
                  <span className="text-lg">{q.icon}</span>
                  <span className="text-xs font-medium text-text-secondary group-hover:text-primary-700">{q.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Profile completion */}
          {profile && profile.profileCompletion < 100 && (
            <Card className="border-primary-200 bg-primary-50/50">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-primary-700 mb-1.5">Complete your profile</p>
                <p className="text-xs text-text-muted mb-3">Better profile = better recommendations</p>
                <Progress value={profile.profileCompletion} indicatorClassName="bg-primary-500" className="mb-3" />
                <p className="text-xs text-primary-600 mb-3">{profile.profileCompletion}% complete</p>
                <Button size="sm" className="w-full" asChild>
                  <Link href="/app/profile">Update Profile</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
