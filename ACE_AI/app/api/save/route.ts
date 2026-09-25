// app/api/save/route.ts — Save/unsave events with XP
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, save } = await req.json();
  const userId = session.user.id;

  try {
    if (save) {
      await prisma.savedEvent.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: {},
        create: { userId, eventId },
      });
      // Award XP
      await prisma.gamificationProfile.upsert({
        where: { userId },
        update: { xp: { increment: 10 }, weeklyXp: { increment: 10 }, monthlyXp: { increment: 10 } },
        create: { userId, xp: 10, weeklyXp: 10, monthlyXp: 10 },
      });
      await prisma.eventActivity.create({ data: { userId, eventId, activityType: "SAVED" } });
    } else {
      await prisma.savedEvent.deleteMany({ where: { userId, eventId } });
      await prisma.eventActivity.create({ data: { userId, eventId, activityType: "UNSAVED" } });
    }
    return NextResponse.json({ ok: true, saved: save });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
