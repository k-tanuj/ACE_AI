// app/api/events/[id]/route.ts — Single event
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Support slug or id lookup
    const event = await prisma.event.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      include: {
        organizer: { include: { user: { select: { name: true, email: true } } } },
        verification: true,
        _count: { select: { savedBy: true } },
      },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    
    // When an event is edited, always reset it to PENDING so AI rescan is required
    body.status = "PENDING";
    
    const event = await prisma.event.update({ where: { id: params.id }, data: body });
    return NextResponse.json(event);
  } catch(e: any) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
