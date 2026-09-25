// app/api/generate/promo/route.ts — Matches SRD §7: POST /api/generate/promo
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generatePromotionalContent, ContentTone } from "@/lib/ai/content-generation";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, type, targetDepartment, location, isRemote, skills, tone } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Event title is required for promo content" }, { status: 400 });
    }

    const promo = await generatePromotionalContent({
      title: title.trim(),
      type: type || "HACKATHON",
      targetDepartment: targetDepartment || "All Students",
      location: location || "Campus Venue",
      isRemote: Boolean(isRemote),
      skills: Array.isArray(skills) ? skills : typeof skills === "string" ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      tone: (tone as ContentTone) || "energetic",
    });

    return NextResponse.json({
      success: true,
      ...promo,
    });
  } catch (err) {
    console.error("[Generate Promo Error]", err);
    return NextResponse.json({ error: "Failed to generate promotional content" }, { status: 500 });
  }
}
