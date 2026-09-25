import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSearchIntent } from "@/lib/ai/search-intent";
import { auth } from "@/lib/auth";
import { addDays } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Smart search is available only after login." },
        { status: 401 }
      );
    }

    const { query } = await req.json();
    const userId = session.user.id;
    if (!query?.trim()) return NextResponse.json({ events: [], intent: null });

    // Parse NL query to structured intent
    const intent = await parseSearchIntent(query);

    // Build DB filters from intent
    const where: Record<string, unknown> = {
      status: "APPROVED",
      registrationDeadline: { gte: new Date() },
    };

    if (intent.eventTypes?.length) {
      where.type = { in: intent.eventTypes };
    }
    if (intent.location) {
      where.location = { contains: intent.location };
    }
    if (intent.isRemote === true) {
      where.isRemote = true;
    }
    if (intent.daysUntil) {
      where.registrationDeadline = {
        gte: intent.daysFrom ? addDays(new Date(), intent.daysFrom) : new Date(),
        lte: addDays(new Date(), intent.daysUntil),
      };
    }
    if (intent.skills?.length) {
      // Keyword match on skills JSON
      where.OR = intent.skills.map((skill) => ({
        skills: { contains: skill },
      }));
    }

    const events = await prisma.event.findMany({
      where,
      include: { organizer: true },
      orderBy: [{ qualityScore: "desc" }],
      take: 20,
    });

    // Compute match % relative to search query
    const scored = events.map((event) => {
      let score = 50;
      const eventText = `${event.title} ${event.description} ${event.skills}`.toLowerCase();
      const queryLower = query.toLowerCase();

      for (const kw of intent.keywords ?? []) {
        if (eventText.includes(kw.toLowerCase())) score += 8;
      }
      if (intent.location && event.location.toLowerCase().includes(intent.location.toLowerCase())) score += 10;
      if (intent.isRemote && event.isRemote) score += 10;
      score = Math.min(99, score);

      return { ...event, matchScore: score, matchReasons: buildReasons(event, intent) };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);

    // FR-2.7: Log search queries for continuous recommendation learning
    if (userId && events.length > 0) {
      prisma.eventActivity.create({
        data: {
          userId,
          eventId: events[0].id,
          activityType: "SEARCH_QUERY",
        },
      }).catch((e) => console.error("[Search Log Error]", e));
    }

    return NextResponse.json({
      events: scored,
      intent,
      clarifyingQuestion: intent.clarifyingQuestion,
      synonyms: intent.expandedSynonyms,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

function buildReasons(event: { type: string; location: string; isRemote: boolean }, intent: { eventTypes?: string[]; location?: string; isRemote?: boolean }): string[] {
  const reasons: string[] = [];
  if (intent.eventTypes?.includes(event.type)) reasons.push(`Matches ${event.type.toLowerCase()} type`);
  if (intent.location && event.location.toLowerCase().includes(intent.location.toLowerCase())) reasons.push(`Located in ${intent.location}`);
  if (intent.isRemote && event.isRemote) reasons.push("Available remotely");
  return reasons;
}
