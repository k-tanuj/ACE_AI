// app/api/chat/route.ts — ACE Chat streaming endpoint conforming to SRD §3.3 (FR-3.1 to FR-3.8)
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AI_AVAILABLE, google, streamText } from "@/lib/ai";
import { StreamData } from "ai";

const SYSTEM_PROMPT = `You are ACE, the AI assistant for AllCollegeEvent (ACE AI) — India's premier student opportunity platform.

Your capabilities:
1. Event Search & Discovery: Recommend hackathons, internships, workshops, competitions, scholarships, certifications, and conferences.
2. Platform Guidance: Explain quality scores (0-100), organizer credibility, badges, streaks, and onboarding.
3. Eligibility & Registration: Break down prerequisites, required skills, and deadlines.
4. Human Escalation: If a user has account billing issues, account suspension, or official complaints, direct them to human support at support@allcollegeevent.com.

STRICT GROUNDING RULES (SRD FR-3.7):
- Ground all event details strictly in the platform data provided in the prompt. Never invent non-existent dates, prizes, or event titles.
- If information is not in the database, clearly state it and offer to search or connect with human support.
- Be concise, supportive, and professional. Avoid emojis.

FORMATTING RULES:
- Use clean markdown only: **bold**, bullet lists with -, numbered lists.
- Do NOT use ++ or any non-standard characters for formatting.
- For event details use a simple bullet list: - **Field:** Value`;

const PLATFORM_FAQS = `
Platform FAQs:
- How recommendations work: We combine semantic interest match (50%), location (20%), department (15%), deadline urgency (10%), and organizer credibility (5%).
- Event Quality Scores: Calculated automatically (0-100) based on completeness, organizer verification, description quality, and registration link security.
- Gamification & XP: Earn XP and badges by exploring opportunities, saving events, maintaining login streaks, and completing daily challenges.
- How to apply: Click any opportunity card to view details and follow the verified registration link.
`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { messages, conversationId } = await req.json();
    const userId = session.user.id;
    const lastMsg = (messages?.[messages.length - 1]?.content ?? "").trim();
    const lastMsgLower = lastMsg.toLowerCase();

    // 1. RAG: Fetch user profile, top recommendations, and relevant events matching query
    const keywords = lastMsgLower
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length > 3);

    const [profile, savedCount, recommendations, matchedEvents] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId } }),
      prisma.savedEvent.count({ where: { userId } }),
      prisma.recommendation.findMany({
        where: { userId },
        include: {
          event: {
            select: { title: true, type: true, location: true, registrationDeadline: true, qualityScore: true },
          },
        },
        orderBy: { score: "desc" },
        take: 3,
      }),
      prisma.event.findMany({
        where: {
          status: "APPROVED",
          registrationDeadline: { gte: new Date() },
          OR: keywords.length
            ? [
                ...keywords.slice(0, 3).map((kw: string) => ({ title: { contains: kw } })),
                ...keywords.slice(0, 3).map((kw: string) => ({ skills: { contains: kw } })),
              ]
            : undefined,
        },
        include: { organizer: { select: { name: true, credibilityScore: true } } },
        take: 4,
      }),
    ]);

    const studentContext = profile
      ? `\n\nStudent Profile:
- Name: ${session.user.name}
- Department: ${profile.department || "Not specified"}
- Skills: ${profile.skills}
- Interests: ${profile.interests}
- City: ${profile.city}, ${profile.state}
- Saved Events Count: ${savedCount}
- Top Recommended: ${recommendations.map((r) => `"${r.event.title}" (${r.event.type})`).join(", ") || "None"}`
      : `\n\nStudent: ${session.user.name}`;

    const retrievedEventsContext = `\n\nRetrieved Platform Events (Grounded Context):
${matchedEvents
  .map(
    (e) =>
      `- Title: ${e.title} | Type: ${e.type} | Location: ${e.location || (e.isRemote ? "Remote" : "N/A")} | Deadline: ${new Date(
        e.registrationDeadline
      ).toLocaleDateString()} | Quality: ${e.qualityScore}% | Organizer: ${e.organizer.name} (${e.organizer.credibilityScore}%)`
  )
  .join("\n") || "No directly matching events found in database."}`;

    // Escalation check (SRD FR-3.5)
    const isEscalationRequested =
      lastMsgLower.includes("human") ||
      lastMsgLower.includes("dispute") ||
      lastMsgLower.includes("complaint") ||
      lastMsgLower.includes("refund") ||
      lastMsgLower.includes("scam");

    if (!AI_AVAILABLE) {
      let responseText = "";

      if (isEscalationRequested) {
        responseText = `I understand you need specialized human assistance. You can reach our dedicated Platform Support Team directly at support@allcollegeevent.com or open a ticket through the Help Center. Our moderators typically respond within 24 hours.`;
      } else if (
        lastMsgLower.includes("hackathon") ||
        lastMsgLower.includes("find") ||
        lastMsgLower.includes("search") ||
        lastMsgLower.includes("opportunity")
      ) {
        if (matchedEvents.length > 0) {
          const list = matchedEvents
            .map(
              (e, i) =>
                `${i + 1}. **${e.title}** (${e.type}) — Location: ${e.isRemote ? "Remote" : e.location}, Quality: ${e.qualityScore}%, Deadline: ${new Date(e.registrationDeadline).toLocaleDateString()}`
            )
            .join("\n\n");
          responseText = `Here are verified opportunities currently open on ACE AI matching your query:\n\n${list}\n\nWould you like more details on how to prepare, or should I refine the search for a specific location?`;
        } else {
          responseText = `I searched our database for "${lastMsg}", but didn't find an exact open event right now. You can check the Discover page or try searching with general terms like "AI" or "Python".`;
        }
      } else if (lastMsgLower.includes("faq") || lastMsgLower.includes("score") || lastMsgLower.includes("xp")) {
        responseText = `Here is how ACE AI works:\n\n- **Quality Scores:** Every event is scanned for verified organizers, valid registration URLs, and clear eligibility.\n- **XP & Streaks:** You earn XP and unlock badges by exploring events and staying active daily.\n- **Smart Matching:** Opportunities are ranked specifically based on your skills, department, and goals.`;
      } else {
        responseText = `Hello ${session.user.name}! I am ACE, your student opportunity advisor. I can help you find verified hackathons, internships, and workshops, check application deadlines, or explain how event quality scores work. What are you looking for today?`;
      }

      // Persist assistant message in conversation
      if (conversationId) {
        await prisma.message.create({
          data: { conversationId, role: "ASSISTANT", content: responseText },
        });
      }

      // Stream words
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const words = responseText.split(" ");
          for (const word of words) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: word + " " })}\n\n`));
            await new Promise((r) => setTimeout(r, 25));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Real AI generation with Gemini + event cards via StreamData
    const streamData = new StreamData();

    // Immediately append matched events as structured data for the frontend to render as cards
    if (matchedEvents.length > 0) {
      streamData.append({
        events: matchedEvents.map((e) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          location: e.isRemote ? "Remote / Online" : (e.location || "N/A"),
          deadline: new Date(e.registrationDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          qualityScore: Math.round(e.qualityScore),
          organizer: e.organizer.name,
          credibilityScore: e.organizer.credibilityScore,
          slug: (e as any).slug || e.id,
        })),
      });
    }

    const result = await streamText({
      model: google("gemini-2.5-flash"),
      system: SYSTEM_PROMPT + PLATFORM_FAQS + studentContext + retrievedEventsContext,
      messages,
      onFinish: async ({ text }) => {
        streamData.close();
        if (conversationId) {
          await prisma.message.create({
            data: { conversationId, role: "ASSISTANT", content: text },
          }).catch(console.error);
        }
      },
    });

    return result.toDataStreamResponse({ data: streamData });
  } catch (err) {
    console.error("[Chat Error]", err);
    return new Response(JSON.stringify({ error: "Chat service encountered an error" }), {
      status: 500,
    });
  }
}
