// lib/ai/content-generation.ts
// AI Content Assistant for organizers

import { aiGenerateText, aiGenerateObject, AI_AVAILABLE } from "@/lib/ai";
import { z } from "zod";

const ContentOutputSchema = z.object({
  eventDescription: z.string(),
  shortSummary: z.string(),
  highlights: z.array(z.string()),
  socialCaption: z.string(),
  callToAction: z.string(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
});

export type ContentOutput = z.infer<typeof ContentOutputSchema>;

interface EventInput {
  title: string;
  type: string;
  organizer: string;
  audience: string;
  date: string;
  location: string;
  skills: string[];
  description?: string;
  tone?: "PROFESSIONAL" | "STUDENT_FRIENDLY";
}

export async function generateEventContent(input: EventInput): Promise<ContentOutput> {
  const prompt = `You are an expert event copywriter for a student opportunity platform called ACE AI.
Generate professional, engaging content for this event listing. No emojis. Clear, concise language.

Event details:
- Title: ${input.title}
- Type: ${input.type}
- Organizer: ${input.organizer}
- Target Audience: ${input.audience}
- Date: ${input.date}
- Location: ${input.location}
- Skills: ${input.skills.join(", ")}
- Tone: ${input.tone || "PROFESSIONAL"}
${input.description ? `- Existing description: ${input.description}` : ""}

Generate:
1. eventDescription (300-500 words): Compelling event description
2. shortSummary (max 120 chars): One-liner for search results
3. highlights (4-6 items): Key bullet points
4. socialCaption (max 280 chars): Twitter/LinkedIn caption
5. callToAction: Short CTA text (e.g., "Register before seats fill up")
6. faq (3-4 items): Common Q&A pairs

Return valid JSON matching the schema.`;

  return aiGenerateObject({
    schema: ContentOutputSchema,
    prompt,
    mockFn: () => generateMockContent(input),
  });
}

function generateMockContent(input: EventInput): ContentOutput {
  return {
    eventDescription: `${input.title} is an exceptional opportunity for ${input.audience} students to showcase their skills and gain real-world experience. Organized by ${input.organizer}, this ${input.type.toLowerCase()} brings together talented students from across India to collaborate, compete, and learn.

Participants will work on challenging problems in ${input.skills.join(", ")}, guided by industry mentors and judges with deep expertise. The event takes place on ${input.date} at ${input.location}.

Whether you are looking to build your portfolio, network with industry professionals, or simply challenge yourself, ${input.title} offers the perfect platform. Finalists will receive certificates, recognition, and opportunities to connect with leading organizations.

Register now and take the next step in your career journey.`,
    shortSummary: `${input.title} — ${input.type.toLowerCase()} for ${input.audience} at ${input.location}`,
    highlights: [
      `Open to ${input.audience} students`,
      `Key skills: ${input.skills.slice(0, 3).join(", ")}`,
      `Location: ${input.location}`,
      "Certificates for all participants",
      "Expert mentors and judges",
      "Networking opportunities",
    ],
    socialCaption: `Calling all ${input.audience} students! ${input.title} is here. Showcase your ${input.skills[0] || "tech"} skills and compete with the best. Register now!`,
    callToAction: "Register now — limited seats available",
    faq: [
      { q: "Who can participate?", a: `${input.audience} students are eligible to participate.` },
      { q: "Is there a registration fee?", a: "Registration details are available on the event page." },
      { q: "What skills do I need?", a: `Knowledge of ${input.skills.slice(0, 2).join(" and ")} is preferred.` },
      { q: "Will certificates be provided?", a: "Yes, all participants will receive a certificate of participation." },
    ],
  };
}
