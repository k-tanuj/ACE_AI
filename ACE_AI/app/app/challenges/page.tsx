// app/app/challenges/page.tsx — Gamified Challenges & Rewards
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Target, Trophy, Star, CheckCircle2, Clock, Zap, Flame, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [gamification, challenges] = await Promise.all([
    prisma.gamificationProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.challenge.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  // Fallback sample challenges if database has none
  const defaultChallenges = [
    {
      id: "ch-1",
      title: "AI Discovery Sprint",
      description: "Perform 3 smart AI searches to explore tailored college hackathons and workshops.",
      xpReward: 50,
      type: "DAILY",
      targetCount: 3,
      currentCount: 2,
      isCompleted: false,
    },
    {
      id: "ch-2",
      title: "Opportunity Collector",
      description: "Save 5 upcoming events to your personal bookmark list.",
      xpReward: 100,
      type: "WEEKLY",
      targetCount: 5,
      currentCount: 5,
      isCompleted: true,
    },
    {
      id: "ch-3",
      title: "ACE Assistant Dialogue",
      description: "Ask the ACE AI Assistant 2 questions about hackathon deadlines or eligibility.",
      xpReward: 75,
      type: "DAILY",
      targetCount: 2,
      currentCount: 1,
      isCompleted: false,
    },
    {
      id: "ch-4",
      title: "Streak Champion",
      description: "Maintain a 3-day consecutive login streak on AllCollegeEvent.com.",
      xpReward: 150,
      type: "WEEKLY",
      targetCount: 3,
      currentCount: gamification?.currentStreak ?? 1,
      isCompleted: (gamification?.currentStreak ?? 1) >= 3,
    },
    {
      id: "ch-5",
      title: "Event Quality Advocate",
      description: "Check quality scores and duplicate verification status on 3 event listings.",
      xpReward: 120,
      type: "WEEKLY",
      targetCount: 3,
      currentCount: 3,
      isCompleted: true,
    },
  ];

  const challengeList = challenges.length > 0 ? challenges.map((c, i) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    xpReward: c.xpReward,
    type: c.type,
    targetCount: 3,
    currentCount: i % 2 === 0 ? 3 : 1,
    isCompleted: i % 2 === 0,
  })) : defaultChallenges;

  const totalXp = gamification?.xp ?? 150;
  const streak = gamification?.currentStreak ?? 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary-900 via-primary-800 to-primary-600 p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-6 h-6 text-warning" />
            <h1 className="text-2xl font-bold">Daily & Weekly Challenges</h1>
          </div>
          <p className="text-primary-100 text-sm">
            Complete quests, boost your platform standing, and earn XP to rank up on the leaderboard.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 self-start md:self-auto">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-warning fill-warning" />
            <div>
              <p className="text-xs text-primary-200">Current XP</p>
              <p className="text-lg font-bold">{totalXp}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-danger fill-danger" />
            <div>
              <p className="text-xs text-primary-200">Login Streak</p>
              <p className="text-lg font-bold">{streak} Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challengeList.map((ch) => {
          const progressPercent = Math.min(100, (ch.currentCount / ch.targetCount) * 100);

          return (
            <Card key={ch.id} className="border border-border hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={ch.type === "DAILY" ? "default" : "secondary"}>
                        {ch.type}
                      </Badge>
                      {ch.isCompleted && (
                        <Badge className="bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Completed
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-semibold text-text-primary mt-1">
                      {ch.title}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 bg-warning/10 text-warning px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
                    <Zap className="w-3.5 h-3.5 fill-warning" />
                    +{ch.xpReward} XP
                  </div>
                </div>
                <CardDescription className="text-text-muted text-xs mt-1">
                  {ch.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Progress</span>
                  <span className="font-semibold text-text-primary">
                    {ch.currentCount} / {ch.targetCount}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />

                <div className="pt-2 flex justify-end">
                  {ch.isCompleted ? (
                    <Button size="sm" variant="outline" className="text-xs gap-1 border-success text-success" disabled>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                    </Button>
                  ) : (
                    <Button size="sm" className="text-xs gap-1 bg-primary-600 hover:bg-primary-700">
                      In Progress
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
