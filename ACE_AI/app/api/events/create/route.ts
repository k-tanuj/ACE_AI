// app/api/events/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkEventQuality } from "@/lib/ai/event-quality";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    const organizer = await prisma.organizer.findUnique({ where: { userId: session.user.id } });
    if (!organizer) return NextResponse.json({ error: "Organizer profile not found" }, { status: 404 });

    // Generate slug
    const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);

    // AI Quality Check
    const qualityResult = await checkEventQuality({
      title: body.title,
      description: body.description,
      eligibility: body.eligibility,
      location: body.isRemote ? "Remote" : body.location,
      startDate: body.startAt,
      endDate: body.endAt,
      registrationUrl: body.registrationUrl,
      organizerName: organizer.name
    });

    const event = await prisma.event.create({
      data: {
        slug,
        title: body.title,
        type: body.type,
        shortSummary: body.shortSummary,
        description: body.description,
        location: body.location,
        isRemote: body.isRemote,
        startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        registrationDeadline: new Date(body.registrationDeadline),
        registrationUrl: body.registrationUrl,
        eligibility: body.eligibility,
        skills: body.skills,
        organizerId: organizer.id,
        status: qualityResult.riskFlags.length > 2 ? "NEEDS_CHANGES" : "PENDING",
        qualityScore: qualityResult.overallScore,
      }
    });

    // Save verification data
    await prisma.eventVerification.create({
      data: {
        eventId: event.id,
        checks: JSON.stringify(qualityResult.breakdown),
        riskFlags: JSON.stringify(qualityResult.riskFlags),
        verifiedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (err) {
    console.error("Create event error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
