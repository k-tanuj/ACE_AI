// app/api/xp/route.ts — Centralized XP award endpoint (SRD §3.4 FR-4.1)
// Called internally or by activity triggers to award XP and update level.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// XP values per activity type (SRD §3.4)
const XP_MAP: Record<string, number> = {
  VIEWED: 5,
  SAVED: 10,
  UNSAVED: 0,
  APPLIED: 30,
  SEARCH_QUERY: 3,
  CHAT_QUERY: 5,
  RECOMMENDATION_HELPFUL: 5,
  RECOMMENDATION_NOT_RELEVANT: 0,
  STREAK_DAY: 15,
  ONBOARDING_COMPLETE: 50,
};

// Badge criteria check
const BADGE_CHECKS = [
  { name: "First Application", criterion: (stats: ActivityStats) => stats.applied >= 1 },
  { name: "Early Explorer", criterion: (stats: ActivityStats) => stats.viewed >= 5 },
  { name: "Opportunity Hunter", criterion: (stats: ActivityStats) => stats.saved >= 10 },
  { name: "AI Explorer", criterion: (stats: ActivityStats) => stats.chatQueries >= 10 },
  { name: "Community Contributor", criterion: (stats: ActivityStats) => stats.reports >= 1 },
];

interface ActivityStats {
  applied: number;
  viewed: number;
  saved: number;
  chatQueries: number;
  reports: number;
}

export function levelFromXp(xp: number): number {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 600) return 3;
  if (xp < 1000) return 4;
  if (xp < 1500) return 5;
  return Math.floor(xp / 500) + 2;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { activityType, eventId } = await req.json();
  const userId = session.user.id;
  const xpGain = XP_MAP[activityType] ?? 0;

  try {
    // Upsert gamification profile (auto-creates if not exists)
    const profile = await prisma.gamificationProfile.upsert({
      where: { userId },
      update: {
        xp: { increment: xpGain },
        weeklyXp: { increment: xpGain },
        monthlyXp: { increment: xpGain },
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        xp: xpGain,
        weeklyXp: xpGain,
        monthlyXp: xpGain,
        lastActiveAt: new Date(),
      },
    });

    // Update level based on new XP
    const newLevel = levelFromXp(profile.xp);
    if (newLevel !== profile.level) {
      await prisma.gamificationProfile.update({
        where: { userId },
        data: { level: newLevel },
      });
    }

    // Check and award badges
    const awardedBadges: string[] = [];
    if (xpGain > 0) {
      const [activityCounts, allBadges, earnedBadges] = await Promise.all([
        prisma.eventActivity.groupBy({
          by: ["activityType"],
          where: { userId },
          _count: { activityType: true },
        }),
        prisma.badge.findMany(),
        prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
      ]);

      const earnedSet = new Set(earnedBadges.map((b) => b.badgeId));
      const stats: ActivityStats = {
        applied: activityCounts.find((a) => a.activityType === "APPLIED")?._count.activityType ?? 0,
        viewed: activityCounts.find((a) => a.activityType === "VIEWED")?._count.activityType ?? 0,
        saved: activityCounts.find((a) => a.activityType === "SAVED")?._count.activityType ?? 0,
        chatQueries: activityCounts.find((a) => a.activityType === "CHAT_QUERY")?._count.activityType ?? 0,
        reports: activityCounts.find((a) => a.activityType === "REPORTED")?._count.activityType ?? 0,
      };

      for (const check of BADGE_CHECKS) {
        if (!check.criterion(stats)) continue;
        const badge = allBadges.find((b) => b.name === check.name);
        if (!badge || earnedSet.has(badge.id)) continue;

        await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
        await prisma.notification.create({
          data: {
            userId,
            type: "BADGE_EARNED",
            title: `Badge unlocked: ${badge.name}`,
            body: badge.description,
            priority: "NORMAL",
          },
        });
        awardedBadges.push(badge.name);
      }
    }

    // Update challenge progress for relevant activities
    if (activityType === "VIEWED") {
      await prisma.challengeProgress.updateMany({
        where: {
          userId,
          completedAt: null,
        },
        data: { progress: { increment: 1 } },
      });
    }

    return NextResponse.json({
      ok: true,
      xpGained: xpGain,
      newXp: profile.xp,
      level: newLevel,
      awardedBadges,
    });
  } catch (err) {
    console.error("[XP Award Error]", err);
    return NextResponse.json({ error: "Failed to award XP" }, { status: 500 });
  }
}
