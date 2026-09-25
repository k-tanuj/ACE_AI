// app/app/progress/page.tsx — Gamification & Progress
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Trophy, Flame, TrendingUp, Target, Star, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { parseJson, xpForLevel, LEVEL_NAMES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [gamification, badges, profile, activityCount] = await Promise.all([
    prisma.gamificationProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.userBadge.findMany({ where: { userId: session.user.id }, include: { badge: true }, orderBy: { earnedAt: "desc" } }),
    prisma.studentProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.eventActivity.count({ where: { userId: session.user.id } }),
  ]);

  const xp = gamification?.xp ?? 0;
  const level = gamification?.level ?? 1;
  const streak = gamification?.currentStreak ?? 0;
  const longestStreak = gamification?.longestStreak ?? 0;
  const nextLevelXp = xpForLevel(level);
  const xpProgress = Math.min(100, (xp / nextLevelXp) * 100);

  const stats = [
    { label: "Total XP", value: xp, icon: Star, color: "text-warning" },
    { label: "Level", value: level, icon: TrendingUp, color: "text-primary-600" },
    { label: "Current Streak", value: `${streak} days`, icon: Flame, color: "text-danger" },
    { label: "Longest Streak", value: `${longestStreak} days`, icon: Trophy, color: "text-success" },
    { label: "Badges Earned", value: badges.length, icon: Award, color: "text-info" },
    { label: "Activity Count", value: activityCount, icon: Target, color: "text-text-primary" },
  ];

  const allBadges = await prisma.badge.findMany();
  const earnedBadgeIds = new Set(badges.map((b) => b.badgeId));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">My Progress</h1>

      {/* XP Card */}
      <Card className="bg-gradient-to-br from-primary-900 to-primary-700 border-0 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-primary-300 text-sm">Level {level}</p>
              <h2 className="text-3xl font-bold">{LEVEL_NAMES[level] ?? "Explorer"}</h2>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{xp}</p>
              <p className="text-primary-300 text-sm">XP total</p>
            </div>
          </div>
          <div className="h-3 rounded-full bg-white/20 overflow-hidden mb-2">
            <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${xpProgress}%` }} />
          </div>
          <p className="text-xs text-primary-300">{xp} / {nextLevelXp} XP to Level {level + 1}</p>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-text-muted">{s.label}</p>
                <p className="text-lg font-bold text-text-primary">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-warning" />Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {allBadges.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id);
              const userBadge = badges.find((b) => b.badgeId === badge.id);
              return (
                <div key={badge.id} className={`p-3 rounded-2xl text-center border-2 transition-all ${earned ? "border-primary-200 bg-primary-50" : "border-border bg-surface opacity-50"}`}>
                  <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: badge.color + "20" }}>
                    <Trophy className="w-5 h-5" style={{ color: badge.color }} />
                  </div>
                  <p className="text-xs font-semibold text-text-primary">{badge.name}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{badge.description}</p>
                  {earned && userBadge && <Badge variant="success" className="mt-1.5 text-[10px]">Earned</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* XP How to earn */}
      <Card>
        <CardHeader><CardTitle>How to Earn XP</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { action: "Complete onboarding", xp: 100 },
              { action: "Save an event", xp: 10 },
              { action: "Apply to an event", xp: 50 },
              { action: "Complete a daily challenge", xp: 30 },
              { action: "Complete a weekly challenge", xp: 80 },
              { action: "Use ACE Chat", xp: 20 },
              { action: "Maintain a 7-day streak", xp: 150 },
            ].map(({ action, xp: actionXp }, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-text-secondary">{action}</span>
                <Badge variant="default">+{actionXp} XP</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
