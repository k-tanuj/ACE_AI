// app/api/chat/route.ts — ACE Chat streaming endpoint
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AI_AVAILABLE } from "@/lib/ai";
import { google, streamText } from "@/lib/ai";

const SYSTEM_PROMPT = `You are ACE, an AI assistant for ACE AI — a student opportunity discovery platform.

Your purpose:
- Help students find hackathons, internships, workshops, competitions, conferences, scholarships, and certifications
- Explain event eligibility, quality scores, and organizer credibility
- Guide students through the platform
- Make personalized recommendations based on their profile
- Summarize event details clearly

Rules:
- Never invent events or data — only reference what you know from the platform
- Be concise and helpful
- Do not use emojis
- Be professional but friendly
- Always suggest next actions

When asked about events, mention that the student can search, browse, or ask you for specific opportunities.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { messages, conversationId } = await req.json();
    const userId = session.user.id;

    // Fetch some context
    const [profile, savedCount, recommendations] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId } }),
      prisma.savedEvent.count({ where: { userId } }),
      prisma.recommendation.findMany({
        where: { userId },
        include: { event: { select: { title: true, type: true, location: true, registrationDeadline: true } } },
        orderBy: { score: "desc" },
        take: 5,
      }),
    ]);

    const contextPreamble = profile
      ? `\n\nStudent context:
- Name: ${session.user.name}
- Department: ${profile.department || "Not specified"}
- Skills: ${profile.skills}
- Interests: ${profile.interests}
- Career goals: ${profile.careerGoals}
- Location: ${profile.city}, ${profile.state}
- Saved events: ${savedCount}
- Top recommendations: ${recommendations.map((r) => `"${r.event.title}" (${r.event.type}, ${Math.round(r.score * 100)}% match)`).join(", ") || "None yet"}`
      : "";

    if (!AI_AVAILABLE) {
      // Mock streaming response
      const mockResponses: Record<string, string> = {
        default: `Hello ${session.user.name}! I'm ACE, your AI assistant on ACE AI. I can help you discover opportunities, understand event details, explain trust scores, and guide your application journey. What are you looking for today?`,
        hackathon: `Based on your AI/ML interest and Python skills, here are the top hackathons I recommend:\n\n1. **HackAI Chennai 2026** — 95% match. This is a premier AI hackathon in Chennai with a ₹5L prize pool. Registration closes in 7 days.\n\n2. **TechFest AI Challenge 2026** — 88% match. IIT Bombay's flagship AI competition. International participation welcome.\n\nWould you like more details on either of these, or should I search for more options?`,
        suitable: `Based on your profile — CSE student at Anna University, Chennai, with Python and Machine Learning skills — **HackAI Chennai 2026** is an excellent match because:\n\n- It's a Hackathon (matches your preferred type)\n- Located in Chennai (your city)\n- Requires Python and ML skills (which you have)\n- Eligible for CSE students\n- High quality score: 92%\n- The organizer (Devfolio) has a credibility score of 88%\n\nI'd recommend registering soon — the deadline is in 7 days.`,
      };

      const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? "";
      let response = mockResponses.default;
      if (lastMsg.includes("hackathon") || lastMsg.includes("find") || lastMsg.includes("search")) response = mockResponses.hackathon;
      if (lastMsg.includes("suitable") || lastMsg.includes("why") || lastMsg.includes("recommend")) response = mockResponses.suitable;

      // Save to DB
      if (conversationId) {
        await prisma.message.create({ data: { conversationId, role: "ASSISTANT", content: response } });
      }

      // Return as SSE stream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const words = response.split(" ");
          for (const word of words) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: word + " " })}\n\n`));
            await new Promise((r) => setTimeout(r, 30));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    // Real AI response
    const result = await streamText({
      model: google("gemini-1.5-flash"),
      system: SYSTEM_PROMPT + contextPreamble,
      messages,
    });

    if (conversationId) {
      const fullText = await result.text;
      await prisma.message.create({ data: { conversationId, role: "ASSISTANT", content: fullText } });
    }

    return result.toAIStreamResponse();
  } catch (err) {
    console.error("[Chat]", err);
    return new Response(JSON.stringify({ error: "Chat failed" }), { status: 500 });
  }
}
