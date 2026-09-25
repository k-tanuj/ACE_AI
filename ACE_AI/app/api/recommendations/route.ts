// app/api/recommendations/route.ts — Personalized recommendations conforming to SRD §3.1 & §7
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  computeRecommendation,
  applyDiversityFilter,
  getColdStartDefaults,
  StudentProfileData,
} from "@/lib/ai/recommendation";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId") || session?.user?.id;

    if (!requestedUserId && !session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Sign in required to fetch recommendations" },
        { status: 401 }
      );
    }

    const targetUserId = requestedUserId || session?.user?.id;

    let profile = targetUserId
      ? await prisma.studentProfile.findUnique({
          where: { userId: targetUserId },
        })
      : null;

    const events = await prisma.event.findMany({
      where: {
        status: "APPROVED",
        registrationDeadline: { gte: new Date() },
      },
      include: {
        organizer: {
          select: {
            credibilityScore: true,
            verificationStatus: true,
            name: true,
          },
        },
      },
      orderBy: { qualityScore: "desc" },
    });

    // Cold-start fallback (SRD FR-1.7)
    let isColdStart = false;
    let effectiveProfile: StudentProfileData;
    if (!profile) {
      isColdStart = true;
      const defaults = getColdStartDefaults();
      effectiveProfile = {
        skills: defaults.skills!,
        interests: defaults.interests!,
        careerGoals: defaults.careerGoals!,
        city: defaults.city!,
        state: defaults.state!,
        department: "General Engineering",
      };
    } else {
      effectiveProfile = {
        department: profile.department,
        college: profile.college,
        skills: profile.skills,
        interests: profile.interests,
        careerGoals: profile.careerGoals,
        city: profile.city,
        state: profile.state,
      };
    }

    // Score all available active events with the SRD weighted formula
    const scored = events.map((event) => {
      const rec = computeRecommendation(effectiveProfile, event);
      return {
        ...event,
        matchScore: rec.score,
        matchReasons: rec.reasons,
        breakdown: rec.breakdown,
      };
    });

    // Rank by matchScore descending
    scored.sort((a, b) => b.matchScore - a.matchScore);

    // Apply diversity filter (SRD §8.2) to prevent repetitive categories
    const diverseEvents = applyDiversityFilter(scored, 2);
    const top = diverseEvents.slice(0, 10); // default N=10 (SRD FR-1.6)

    // If student has a profile record, persist recommendations for history
    if (profile && targetUserId) {
      await Promise.all(
        top.map((e) =>
          prisma.recommendation.upsert({
            where: { userId_eventId: { userId: targetUserId, eventId: e.id } },
            update: {
              score: e.matchScore / 100,
              reasons: JSON.stringify(e.matchReasons),
            },
            create: {
              userId: targetUserId,
              eventId: e.id,
              profileId: profile!.id,
              score: e.matchScore / 100,
              reasons: JSON.stringify(e.matchReasons),
            },
          })
        )
      );
    }

    return NextResponse.json({
      events: top,
      totalEvaluated: events.length,
      isColdStart,
      profileComplete: profile?.onboardingDone ?? false,
    });
  } catch (err) {
    console.error("[Recommendations GET]", err);
    return NextResponse.json(
      { error: "Failed to compute recommendations" },
      { status: 500 }
    );
  }
}

// POST feedback (thumbs_up, thumbs_down, viewed, saved, dismissed, applied)
// Implements user feedback loop (SRD §8.3)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, activityType, feedback } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    // Map feedback to activityType if provided
    const resolvedType =
      feedback === "UP"
        ? "RECOMMENDATION_HELPFUL"
        : feedback === "DOWN"
        ? "RECOMMENDATION_NOT_RELEVANT"
        : activityType || "VIEWED";

    await prisma.eventActivity.create({
      data: {
        userId: session.user.id,
        eventId,
        activityType: resolvedType,
      },
    });

    return NextResponse.json({ ok: true, recorded: resolvedType });
  } catch (err) {
    console.error("[Recommendations POST]", err);
    return NextResponse.json({ error: "Failed to record feedback" }, { status: 500 });
  }
}
