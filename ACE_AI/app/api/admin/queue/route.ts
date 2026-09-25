// app/api/admin/queue/route.ts — Real pending event queue for admin moderation
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const pending = await prisma.event.findMany({
      where: { status: { in: ["PENDING", "NEEDS_CHANGES"] } },
      include: {
        organizer: {
          select: {
            name: true,
            credibilityScore: true,
            verificationStatus: true,
            website: true,
          },
        },
        verification: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const queue = pending.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      status: e.status,
      organizer: e.organizer.name,
      organizerCredibility: e.organizer.credibilityScore,
      organizerStatus: e.organizer.verificationStatus,
      qualityScore: e.qualityScore,
      eqs: e.verification?.qualityScore ?? e.qualityScore,
      ocs: e.organizer.credibilityScore,
      riskFlags: e.verification?.riskFlags ? JSON.parse(e.verification.riskFlags as string) : [],
      recommendations: e.verification?.recommendations
        ? JSON.parse(e.verification.recommendations as string)
        : [],
      registrationUrl: e.registrationUrl,
      createdAt: e.createdAt,
      // Derived trust tier from OCS
      tier:
        e.organizer.credibilityScore >= 80
          ? "Trusted Partner"
          : e.organizer.credibilityScore >= 50
          ? "Verified"
          : e.organizer.credibilityScore >= 25
          ? "Caution"
          : "High Risk",
      // Auto-flagged reasons
      autoReason: buildAutoReason(e),
      priority: e.organizer.credibilityScore < 40 || e.qualityScore < 40 ? "high" : "normal",
    }));

    return NextResponse.json({ queue, total: queue.length });
  } catch (err) {
    console.error("[Admin Queue Error]", err);
    return NextResponse.json({ error: "Failed to load queue" }, { status: 500 });
  }
}

function buildAutoReason(e: {
  registrationUrl: string;
  description: string;
  organizer: { credibilityScore: number; verificationStatus: string };
  qualityScore: number;
}): string {
  const reasons: string[] = [];
  if (e.organizer.credibilityScore < 40) reasons.push("Low organizer credibility score");
  if (e.organizer.verificationStatus !== "VERIFIED") reasons.push("Organizer not verified");
  if (!e.registrationUrl) reasons.push("Missing registration URL");
  if (e.description.length < 100) reasons.push("Description too short");
  if (e.qualityScore < 50) reasons.push("Event quality score below threshold");

  const spamKeywords = ["guaranteed", "100% placement", "free laptop", "click here", "limited seats"];
  const descLower = e.description.toLowerCase();
  const found = spamKeywords.filter((k) => descLower.includes(k));
  if (found.length > 0) reasons.push(`Spam keywords detected: ${found.join(", ")}`);

  return reasons.length > 0 ? reasons.join(". ") : "Flagged for routine review.";
}
