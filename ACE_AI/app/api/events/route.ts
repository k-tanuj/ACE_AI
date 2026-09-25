// app/api/events/route.ts — Events listing with filters
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const location = searchParams.get("location");
  const isRemote = searchParams.get("remote");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "12");
  const skip = (page - 1) * limit;

  try {
    const where = {
      status: "APPROVED" as const,
      ...(type ? { type: type as never } : {}),
      ...(location ? { location: { contains: location } } : {}),
      ...(isRemote === "true" ? { isRemote: true } : {}),
      registrationDeadline: { gte: new Date() },
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: { organizer: true },
        orderBy: [{ qualityScore: "desc" }, { registrationDeadline: "asc" }],
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({ events, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
