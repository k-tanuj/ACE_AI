// app/api/events/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkEventQuality } from "@/lib/ai/event-quality";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Auto-create or find organizer profile
    let organizer = await prisma.organizer.findUnique({ where: { userId: session.user.id } });
    if (!organizer) {
      organizer = await prisma.organizer.create({
        data: {
          userId: session.user.id,
          name: session.user.name || "Organizer Profile",
          description: "Registered Event Organizer",
          verificationStatus: "VERIFIED",
          credibilityScore: 85.0,
        },
      });
    }

    // Generate unique slug
    const baseSlug = (body.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

    // AI Quality Check
    const qualityResult = checkEventQuality({
      title: body.title || "Untitled Event",
      type: body.type || "COMPETITION",
      description: body.description || "",
      eligibility: typeof body.eligibility === "string" ? body.eligibility : JSON.stringify(body.eligibility || []),
      skills: typeof body.skills === "string" ? body.skills : JSON.stringify(body.skills || []),
      location: body.isRemote ? "Remote / Online" : body.location || "TBD",
      isRemote: Boolean(body.isRemote),
      startAt: body.startAt ? new Date(body.startAt) : new Date(),
      endAt: body.endAt ? new Date(body.endAt) : null,
      registrationDeadline: body.registrationDeadline ? new Date(body.registrationDeadline) : new Date(),
      registrationUrl: body.registrationUrl || "",
    });

    const event = await prisma.event.create({
      data: {
        slug,
        title: body.title,
        type: body.type || "HACKATHON",
        shortSummary: body.shortSummary || "",
        description: body.description || "",
        location: body.isRemote ? "Remote / Online" : body.location || "",
        isRemote: Boolean(body.isRemote),
        startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        registrationDeadline: new Date(body.registrationDeadline),
        registrationUrl: body.registrationUrl || "",
        eligibility: typeof body.eligibility === "string" ? body.eligibility : JSON.stringify(body.eligibility || []),
        skills: typeof body.skills === "string" ? body.skills : JSON.stringify(body.skills || []),
        organizerId: organizer.id,
        status: qualityResult.riskFlags.length > 2 ? "NEEDS_CHANGES" : "PENDING",
        qualityScore: qualityResult.overallScore,
      },
    });

    // Save verification data
    await prisma.eventVerification.create({
      data: {
        eventId: event.id,
        qualityScore: qualityResult.overallScore,
        checks: JSON.stringify(qualityResult.breakdown),
        riskFlags: JSON.stringify(qualityResult.riskFlags),
        recommendations: JSON.stringify(qualityResult.recommendations),
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (err: any) {
    console.error("Create event error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
