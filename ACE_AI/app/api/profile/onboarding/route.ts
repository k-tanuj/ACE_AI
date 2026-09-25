// app/api/profile/onboarding/route.ts — Save onboarding data
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Compute profile completion
  let completion = 0;
  if (body.college) completion += 15;
  if (body.department) completion += 15;
  if (body.city) completion += 10;
  if (body.skills?.length) completion += 20;
  if (body.interests?.length) completion += 15;
  if (body.careerGoals?.length) completion += 15;
  if (body.locationPref?.length) completion += 10;

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: {
      college: body.college,
      department: body.department,
      graduationYear: body.graduationYear,
      city: body.city,
      state: body.state,
      skills: JSON.stringify(body.skills ?? []),
      interests: JSON.stringify(body.interests ?? []),
      careerGoals: JSON.stringify(body.careerGoals ?? []),
      locationPref: JSON.stringify(body.locationPref ?? []),
      notifFrequency: body.notifFrequency,
      profileCompletion: completion,
      onboardingDone: true,
    },
  });

  // Award XP for completing onboarding
  await prisma.gamificationProfile.upsert({
    where: { userId: session.user.id },
    update: { xp: { increment: 100 }, weeklyXp: { increment: 100 }, monthlyXp: { increment: 100 } },
    create: { userId: session.user.id, xp: 100, weeklyXp: 100, monthlyXp: 100 },
  });

  return NextResponse.json({ ok: true, profileCompletion: completion });
}
