// app/api/verify/event/[eventId]/route.ts — Matches SRD §7: GET /api/verify/event/{event_id}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scanEventQuality } from "@/lib/ai/event-quality";

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: true,
        reports: { select: { id: true, reason: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch existing events to check for duplicates (FR-5.1)
    const otherEvents = await prisma.event.findMany({
      where: { id: { not: eventId } },
      select: { id: true, title: true, description: true },
      take: 50,
    });

    const qualityResult = scanEventQuality({
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      registrationDeadline: event.registrationDeadline,
      startAt: event.startAt,
      endAt: event.endAt,
      location: event.location,
      isRemote: event.isRemote,
      eligibility: event.eligibility,
      skills: event.skills,
      registrationUrl: event.registrationUrl,
      organizer: {
        verificationStatus: event.organizer.verificationStatus,
        credibilityScore: event.organizer.credibilityScore,
      },
      reportsCount: event.reports.length,
      existingEvents: otherEvents,
    });

    // Upsert verification record in database
    await prisma.eventVerification.upsert({
      where: { eventId: event.id },
      update: {
        qualityScore: qualityResult.score,
        checks: JSON.stringify(qualityResult.checks),
        riskFlags: JSON.stringify(qualityResult.riskFlags),
        recommendations: JSON.stringify(qualityResult.recommendations),
      },
      create: {
        eventId: event.id,
        qualityScore: qualityResult.score,
        checks: JSON.stringify(qualityResult.checks),
        riskFlags: JSON.stringify(qualityResult.riskFlags),
        recommendations: JSON.stringify(qualityResult.recommendations),
      },
    });

    // Update event quality score
    await prisma.event.update({
      where: { id: event.id },
      data: { qualityScore: qualityResult.score },
    });

    return NextResponse.json({
      eventId: event.id,
      title: event.title,
      currentStatus: event.status,
      qualityScore: qualityResult.score,
      verdict: qualityResult.verdict,
      checks: qualityResult.checks,
      riskFlags: qualityResult.riskFlags,
      recommendations: qualityResult.recommendations,
      duplicateCandidate: qualityResult.duplicateCandidate,
    });
  } catch (err) {
    console.error("[Verify Event Error]", err);
    return NextResponse.json({ error: "Failed to scan event quality" }, { status: 500 });
  }
}
