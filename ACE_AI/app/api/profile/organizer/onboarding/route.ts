// app/api/profile/organizer/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Check if organizer already exists
    const existing = await prisma.organizer.findUnique({
      where: { userId: session.user.id },
    });

    if (existing) {
      // Update
      await prisma.organizer.update({
        where: { userId: session.user.id },
        data: {
          name: body.name,
          website: body.website || "",
          description: body.description,
        }
      });
    } else {
      // Create
      await prisma.organizer.create({
        data: {
          userId: session.user.id,
          name: body.name,
          website: body.website || "",
          description: body.description,
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Organizer onboarding error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
