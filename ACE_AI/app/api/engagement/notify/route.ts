// app/api/engagement/notify/route.ts — Smart Notifications Engine conforming to SRD §3.4 & §7
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addDays, subDays } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // Allow either authenticated user triggering check for themselves or admin triggering batch scan
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || session?.user?.id;

    const users = targetUserId
      ? await prisma.user.findMany({
          where: { id: targetUserId },
          include: {
            studentProfile: true,
            gamification: true,
            savedEvents: { include: { event: true } },
          },
        })
      : await prisma.user.findMany({
          where: { role: "STUDENT" },
          include: {
            studentProfile: true,
            gamification: true,
            savedEvents: { include: { event: true } },
          },
          take: 50,
        });

    const now = new Date();
    const in48Hours = addDays(now, 2);
    const notificationsCreated: { userId: string; title: string; priority: string }[] = [];

    for (const u of users) {
      // Rule 1: Deadline reminder within 48h for saved events (SRD §3.4 logic)
      for (const saved of u.savedEvents) {
        const deadline = new Date(saved.event.registrationDeadline);
        if (deadline > now && deadline <= in48Hours) {
          const title = `Deadline in 48h: ${saved.event.title}`;
          const existing = await prisma.notification.findFirst({
            where: {
              userId: u.id,
              title,
              createdAt: { gte: subDays(now, 2) },
            },
          });

          if (!existing) {
            await prisma.notification.create({
              data: {
                userId: u.id,
                type: "DEADLINE_APPROACHING",
                title,
                body: `The registration deadline for "${saved.event.title}" ends in less than 48 hours. Submit your application now.`,
                link: `/events`,
                priority: "URGENT",
              },
            });
            notificationsCreated.push({ userId: u.id, title, priority: "URGENT" });
          }
        }
      }

      // Rule 2: Inactive for >= 3 days & has relevant opportunities
      if (u.gamification?.lastActiveAt) {
        const daysInactive = Math.floor(
          (now.getTime() - new Date(u.gamification.lastActiveAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysInactive >= 3) {
          const title = "New opportunities are waiting for you";
          const existing = await prisma.notification.findFirst({
            where: {
              userId: u.id,
              title,
              createdAt: { gte: subDays(now, 3) },
            },
          });

          if (!existing) {
            await prisma.notification.create({
              data: {
                userId: u.id,
                type: "RE_ENGAGEMENT",
                title,
                body: `We noticed you've been away for ${daysInactive} days! Several new verified events have been posted matching your profile.`,
                link: `/app/discover`,
                priority: "IMPORTANT",
              },
            });
            notificationsCreated.push({ userId: u.id, title, priority: "IMPORTANT" });
          }
        }
      }

      // Rule 3: Re-engagement if streak was broken
      if (u.gamification && u.gamification.currentStreak === 0 && u.gamification.longestStreak > 2) {
        const title = "Start a new streak today";
        const existing = await prisma.notification.findFirst({
          where: {
            userId: u.id,
            title,
            createdAt: { gte: subDays(now, 5) },
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              type: "STREAK_REMINDER",
              title,
              body: `Your previous record was a ${u.gamification.longestStreak}-day streak! Check out an event today to start a new streak.`,
              link: `/app`,
              priority: "NORMAL",
            },
          });
          notificationsCreated.push({ userId: u.id, title, priority: "NORMAL" });
        }
      }
    }

    return NextResponse.json({
      success: true,
      scannedUsers: users.length,
      notificationsCreatedCount: notificationsCreated.length,
      notifications: notificationsCreated,
    });
  } catch (err) {
    console.error("[Engagement Notify Error]", err);
    return NextResponse.json({ error: "Failed to dispatch notifications" }, { status: 500 });
  }
}
