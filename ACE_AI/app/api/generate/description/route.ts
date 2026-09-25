// app/api/generate/description/route.ts — Matches SRD §7: POST /api/generate/description
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateEventDescription, ContentTone } from "@/lib/ai/content-generation";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, type, organizer, targetDepartment, date, location, isRemote, skills, tone } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Event title is required to generate description" }, { status: 400 });
    }

    const generated = await generateEventDescription({
      title: title.trim(),
      type: type || "HACKATHON",
      organizer: organizer || session.user.name || "Organizer",
      targetDepartment: targetDepartment || "All Departments",
      date,
      location,
      isRemote: Boolean(isRemote),
      skills: Array.isArray(skills) ? skills : typeof skills === "string" ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      tone: (tone as ContentTone) || "formal",
    });

    return NextResponse.json({
      success: true,
      ...generated,
    });
  } catch (err) {
    console.error("[Generate Description Error]", err);
    return NextResponse.json({ error: "Failed to generate event description" }, { status: 500 });
  }
}
