// lib/ai/search-intent.ts
// Parse natural-language search queries into structured filters

import { aiGenerateObject, AI_AVAILABLE } from "@/lib/ai";
import { z } from "zod";

const SearchIntentSchema = z.object({
  eventTypes: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  daysFrom: z.number().optional(),
  daysUntil: z.number().optional(),
  eligibility: z.string().optional(),
  careerGoal: z.string().optional(),
  keywords: z.array(z.string()),
  intent: z.string(),
});

export type SearchIntent = z.infer<typeof SearchIntentSchema>;

export async function parseSearchIntent(query: string): Promise<SearchIntent> {
  return aiGenerateObject({
    schema: SearchIntentSchema,
    prompt: `Parse this student opportunity search query into structured filters.
Query: "${query}"

Extract:
- eventTypes: array from [HACKATHON, COMPETITION, WORKSHOP, INTERNSHIP, CONFERENCE, SCHOLARSHIP, CERTIFICATION, RESEARCH]
- skills: specific technical skills mentioned
- department: academic department if mentioned (e.g. "CSE", "IT", "ECE")
- location: city/state if mentioned
- isRemote: true if "remote" or "online" mentioned
- daysFrom/daysUntil: days range if time mentioned (e.g. "this month" = daysUntil: 30)
- keywords: important keywords for text search
- intent: one-sentence summary of what the student is looking for

Return valid JSON.`,
    mockFn: () => mockParseQuery(query),
  });
}

/** Deterministic mock parser for demo mode */
function mockParseQuery(query: string): SearchIntent {
  const q = query.toLowerCase();
  const intent: SearchIntent = { keywords: [], intent: query };

  // Event types
  const types: string[] = [];
  if (q.includes("hackathon")) types.push("HACKATHON");
  if (q.includes("workshop")) types.push("WORKSHOP");
  if (q.includes("internship")) types.push("INTERNSHIP");
  if (q.includes("competition") || q.includes("contest")) types.push("COMPETITION");
  if (q.includes("conference") || q.includes("summit")) types.push("CONFERENCE");
  if (q.includes("scholarship")) types.push("SCHOLARSHIP");
  if (q.includes("certification") || q.includes("cert")) types.push("CERTIFICATION");
  if (q.includes("research")) types.push("RESEARCH");
  if (q.includes("ai") || q.includes("machine learning") || q.includes("ml")) types.push("HACKATHON", "COMPETITION");
  intent.eventTypes = [...new Set(types)];

  // Skills
  const skills: string[] = [];
  const skillKeywords = ["python", "java", "react", "javascript", "typescript", "tensorflow", "pytorch", "machine learning", "data science", "cloud", "cybersecurity", "kotlin", "android", "figma", "ui/ux"];
  for (const sk of skillKeywords) {
    if (q.includes(sk)) skills.push(sk);
  }
  intent.skills = skills;

  // Location
  const cities = ["chennai", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "pune", "kolkata"];
  for (const city of cities) {
    if (q.includes(city)) {
      intent.location = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  // Remote
  if (q.includes("remote") || q.includes("online") || q.includes("virtual")) {
    intent.isRemote = true;
  }

  // Time
  if (q.includes("this month")) intent.daysUntil = 30;
  if (q.includes("this week")) intent.daysUntil = 7;
  if (q.includes("next week")) { intent.daysFrom = 7; intent.daysUntil = 14; }
  if (q.includes("before next friday") || q.includes("friday")) intent.daysUntil = 7;

  // Department
  if (q.includes("cse") || q.includes("computer science")) intent.department = "CSE";
  if (q.includes("it") || q.includes("information technology")) intent.department = "IT";

  // Keywords
  const words = query.split(/\s+/).filter((w) => w.length > 3);
  intent.keywords = words.slice(0, 8);

  intent.intent = `Looking for ${types.length ? types.join("/").toLowerCase() : "opportunities"} ${intent.location ? `in ${intent.location}` : ""} ${intent.isRemote ? "(remote)" : ""}`.trim();

  return intent;
}
