// app/api/recommendations/[userId]/route.ts — Matches SRD §7: GET /api/recommendations/{user_id}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  computeRecommendation,
  applyDiversityFilter,
  getColdStartDefaults,
  StudentProfileData,
} from "@/lib/ai/recommendation";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    const userId = params.userId;

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Sign in required" },
        { status: 401 }
      );
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    const events = await prisma.event.findMany({
      where: {
        status: "APPROVED",
        registrationDeadline: { gte: new Date() },
      },
      include: {
        organizer: {
          select: { credibilityScore: true, verificationStatus: true, name: true },
        },
      },
      orderBy: { qualityScore: "desc" },
    });

    let effectiveProfile: StudentProfileData;
    let isColdStart = false;

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

    const scored = events.map((event) => {
      const rec = computeRecommendation(effectiveProfile, event);
      return {
        ...event,
        matchScore: rec.score,
        matchReasons: rec.reasons,
        breakdown: rec.breakdown,
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    const diverse = applyDiversityFilter(scored, 2);
    const top = diverse.slice(0, 10);

    return NextResponse.json({
      userId,
      events: top,
      isColdStart,
      count: top.length,
    });
  } catch (err) {
    console.error("[Recommendations userId GET]", err);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
