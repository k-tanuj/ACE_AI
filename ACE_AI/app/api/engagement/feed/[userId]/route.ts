// app/api/engagement/feed/[userId]/route.ts — Matches SRD §7: GET /api/engagement/feed/{user_id}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRecommendation, applyDiversityFilter, getColdStartDefaults } from "@/lib/ai/recommendation";
import { addDays } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    const [profile, gamification, savedEvents, allEvents] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId } }),
      prisma.gamificationProfile.findUnique({ where: { userId } }),
      prisma.savedEvent.findMany({ where: { userId }, select: { eventId: true } }),
      prisma.event.findMany({
        where: {
          status: "APPROVED",
          registrationDeadline: { gte: new Date() },
        },
        include: { organizer: { select: { name: true, credibilityScore: true } } },
        orderBy: { qualityScore: "desc" },
      }),
    ]);

    const effectiveProfile = profile
      ? {
          department: profile.department,
          college: profile.college,
          skills: profile.skills,
          interests: profile.interests,
          careerGoals: profile.careerGoals,
          city: profile.city,
          state: profile.state,
        }
      : {
          skills: getColdStartDefaults().skills!,
          interests: getColdStartDefaults().interests!,
          careerGoals: getColdStartDefaults().careerGoals!,
          city: getColdStartDefaults().city!,
          state: getColdStartDefaults().state!,
          department: "General Engineering",
        };

    const savedSet = new Set(savedEvents.map((s) => s.eventId));

    const scored = allEvents.map((e) => {
      const rec = computeRecommendation(effectiveProfile, e);
      return {
        ...e,
        matchScore: rec.score,
        matchReasons: rec.reasons,
        isSaved: savedSet.has(e.id),
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    const diverse = applyDiversityFilter(scored, 2);

    const threeDaysFromNow = addDays(new Date(), 3);
    const endingSoon = scored
      .filter((e) => new Date(e.registrationDeadline) <= threeDaysFromNow)
      .slice(0, 4);

    return NextResponse.json({
      userId,
      feed: {
        hero: diverse[0] || null,
        topRecommendations: diverse.slice(1, 7),
        endingSoon,
      },
      gamification: {
        streak: gamification?.currentStreak ?? 0,
        xp: gamification?.xp ?? 0,
        level: gamification?.level ?? 1,
      },
    });
  } catch (err) {
    console.error("[Engagement Feed userId GET]", err);
    return NextResponse.json({ error: "Failed to generate feed" }, { status: 500 });
  }
}
