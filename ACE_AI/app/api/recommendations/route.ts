// app/api/recommendations/route.ts — Personalized recommendations
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeRecommendation } from "@/lib/ai/recommendation";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
    });

    const events = await prisma.event.findMany({
      where: { status: "APPROVED", registrationDeadline: { gte: new Date() } },
      include: { organizer: true },
    });

    if (!profile) {
      // No profile — return top quality events
      return NextResponse.json({ events: events.slice(0, 10).map((e) => ({ ...e, matchScore: e.qualityScore, matchReasons: ["Highly rated event"] })) });
    }

    // Score all events
    const scored = events.map((event) => {
      const result = computeRecommendation(profile, event);
      return { ...event, matchScore: result.score, matchReasons: result.reasons };
    });

    // Sort by score, take top 15
    scored.sort((a, b) => b.matchScore - a.matchScore);
    const top = scored.slice(0, 15);

    // Upsert recommendations in DB for history
    await Promise.all(
      top.map((e) =>
        prisma.recommendation.upsert({
          where: { userId_eventId: { userId: session.user.id, eventId: e.id } },
          update: { score: e.matchScore / 100, reasons: JSON.stringify(e.matchReasons) },
          create: { userId: session.user.id, eventId: e.id, profileId: profile.id, score: e.matchScore / 100, reasons: JSON.stringify(e.matchReasons) },
        })
      )
    );

    return NextResponse.json({ events: top, profileComplete: profile.onboardingDone });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });
  }
}

// POST feedback (viewed, saved, dismissed, applied)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, activityType } = await req.json();
  await prisma.eventActivity.create({
    data: { userId: session.user.id, eventId, activityType },
  });
  return NextResponse.json({ ok: true });
}
