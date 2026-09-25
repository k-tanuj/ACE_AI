// app/api/verify/scan/route.ts — Matches SRD §7: POST /api/verify/scan
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { scanEventQuality } from "@/lib/ai/event-quality";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // In production require admin role
    if (session?.user && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch(e) {}
    
    const whereClause = body?.eventId ? { id: body.eventId } : {};

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        organizer: true,
        reports: { select: { id: true, reason: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const existingEventsSummary = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      organizerId: e.organizerId
    }));

    const results = [];
    let autoApproveCount = 0;
    let autoQuarantineCount = 0;
    let rejectCount = 0;
    let duplicatesFound = 0;

    for (const event of events) {
      // 1. Fetch AI scan from FastAPI stateless bridge
      const organizerEvents = existingEventsSummary.filter(e => e.organizerId === event.organizerId);
      
      const payload = {
        candidate_event: event,
        organizer: event.organizer,
        organizer_events: organizerEvents,
        existing_events: existingEventsSummary.filter(e => e.id !== event.id)
      };

      const res = await fetch("http://127.0.0.1:8000/api/stateless/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        console.warn(`FastAPI scan failed for event ${event.id}`);
        continue;
      }
      
      const scan = await res.json();
      const verdict = scan.decision?.decision || "AUTO_QUARANTINE";
      const score = scan.eqs?.eqs || 0;
      const riskFlags = scan.fraud?.flags || [];
      const isDuplicate = scan.dup?.is_duplicate || false;

      if (verdict === "AUTO_APPROVE") autoApproveCount++;
      if (verdict === "AUTO_QUARANTINE") autoQuarantineCount++;
      if (verdict === "AUTO_REJECT") rejectCount++;
      if (isDuplicate) duplicatesFound++;

      // Update event verification and qualityScore
      await prisma.eventVerification.upsert({
        where: { eventId: event.id },
        update: {
          qualityScore: score,
          checks: JSON.stringify(scan.eqs?.breakdown || {}),
          riskFlags: JSON.stringify(riskFlags),
          recommendations: JSON.stringify(scan.decision?.next_actions || []),
        },
        create: {
          eventId: event.id,
          qualityScore: score,
          checks: JSON.stringify(scan.eqs?.breakdown || {}),
          riskFlags: JSON.stringify(riskFlags),
          recommendations: JSON.stringify(scan.decision?.next_actions || []),
        },
      });

      // Update actual Event status based on fully automated decision
      const mappedStatus = scan.mapped_status || "PENDING";
      await prisma.event.update({
        where: { id: event.id },
        data: { 
            qualityScore: score,
            status: mappedStatus === "APPROVED" ? "APPROVED" : mappedStatus === "REJECTED" ? "REJECTED" : "PENDING"
        },
      });

      results.push({
        id: event.id,
        title: event.title,
        organizer: event.organizer.name,
        qualityScore: score,
        verdict: verdict,
        riskFlags: riskFlags,
        duplicateCandidate: isDuplicate,
      });
    }

    return NextResponse.json({
      success: true,
      totalScanned: events.length,
      insights: {
        autoApprove: autoApproveCount,
        autoQuarantine: autoQuarantineCount,
        flaggedForRejection: rejectCount,
        potentialDuplicates: duplicatesFound,
      },
      results,
    });
  } catch (err) {
    console.error("[Verify Scan Error]", err);
    return NextResponse.json({ error: "Quality scanner failed" }, { status: 500 });
  }
}
