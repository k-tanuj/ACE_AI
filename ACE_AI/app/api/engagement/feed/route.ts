// app/api/engagement/feed/route.ts — Personalized Engagement Feed conforming to SRD §3.4 & §7
import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeRecommendation, applyDiversityFilter, getColdStartDefaults } from "@/lib/ai/recommendation";
import { addDays } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || session?.user?.id;

    if (!userId && !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetUserId = userId || session?.user?.id;

    const [profile, gamification, savedEvents, allEvents] = await Promise.all([
      targetUserId ? prisma.studentProfile.findUnique({ where: { userId: targetUserId } }) : null,
      targetUserId ? prisma.gamificationProfile.findUnique({ where: { userId: targetUserId } }) : null,
      targetUserId ? prisma.savedEvent.findMany({ where: { userId: targetUserId }, select: { eventId: true } }) : [],
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

    // Compute scores
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

    // Urgent / Ending soon (within 3 days)
    const threeDaysFromNow = addDays(new Date(), 3);
    const endingSoon = scored
      .filter((e) => new Date(e.registrationDeadline) <= threeDaysFromNow)
      .slice(0, 4);

    // Local in user's city or Remote
    const localOrRemote = scored
      .filter(
        (e) =>
          e.isRemote ||
          (effectiveProfile.city &&
            e.location.toLowerCase().includes(effectiveProfile.city.toLowerCase()))
      )
      .slice(0, 4);

    return NextResponse.json({
      feed: {
        hero: diverse[0] || null,
        topRecommendations: diverse.slice(1, 7),
        endingSoon,
        localOrRemote,
      },
      gamification: {
        streak: gamification?.currentStreak ?? 0,
        xp: gamification?.xp ?? 0,
        level: gamification?.level ?? 1,
      },
      user: {
        name: session?.user?.name,
        city: effectiveProfile.city,
        department: effectiveProfile.department,
      },
    });
  } catch (err) {
    console.error("[Engagement Feed GET]", err);
    return NextResponse.json({ error: "Failed to generate engagement feed" }, { status: 500 });
  }
}
