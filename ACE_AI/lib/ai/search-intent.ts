// lib/ai/search-intent.ts
// Parse natural-language search queries into structured filters
// Conforming to SRD §3.2 (FR-2.1 to FR-2.7)

import { aiGenerateObject } from "@/lib/ai";
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
  clarifyingQuestion: z.string().optional(),
  expandedSynonyms: z.array(z.string()).optional(),
});

export type SearchIntent = z.infer<typeof SearchIntentSchema>;

/** Common spelling corrections and synonyms (SRD §8.2) */
const SYNONYM_MAP: Record<string, string> = {
  ml: "machine learning",
  ai: "artificial intelligence",
  chenai: "chennai",
  banglore: "bangalore",
  bengaluru: "bangalore",
  blr: "bangalore",
  bombay: "mumbai",
  cs: "cse",
  compsci: "cse",
  webdev: "web development",
  frontend: "react",
  backend: "node.js",
  appdev: "android",
  cyber: "cybersecurity",
  crypto: "blockchain",
};

export function expandQueryWithSynonyms(query: string): { expandedQuery: string; synonyms: string[] } {
  const words = query.toLowerCase().split(/\s+/);
  const synonyms: string[] = [];

  const expandedWords = words.map((w) => {
    const clean = w.replace(/[^a-z0-9]/g, "");
    if (SYNONYM_MAP[clean]) {
      synonyms.push(`${clean} → ${SYNONYM_MAP[clean]}`);
      return `${w} ${SYNONYM_MAP[clean]}`;
    }
    return w;
  });

  return {
    expandedQuery: expandedWords.join(" "),
    synonyms,
  };
}

export async function parseSearchIntent(query: string): Promise<SearchIntent> {
  const { expandedQuery, synonyms } = expandQueryWithSynonyms(query);

  const parsed = await aiGenerateObject({
    schema: SearchIntentSchema,
    prompt: `Parse this student opportunity search query into structured filters.
Query: "${query}" (Expanded: "${expandedQuery}")

Extract:
- eventTypes: array from [HACKATHON, COMPETITION, WORKSHOP, INTERNSHIP, CONFERENCE, SCHOLARSHIP, CERTIFICATION, RESEARCH]
- skills: specific technical skills mentioned
- department: academic department if mentioned (e.g. "CSE", "IT", "ECE")
- location: city/state if mentioned
- isRemote: true if "remote" or "online" mentioned
- daysFrom/daysUntil: days range if time mentioned (e.g. "this month" = daysUntil: 30)
- keywords: important keywords for hybrid search
- intent: concise summary of what student wants
- clarifyingQuestion: if query is ambiguous or only 1 word, provide a helpful follow-up question

Return valid JSON matching schema.`,
    mockFn: () => mockParseQuery(query, synonyms),
  });

  parsed.expandedSynonyms = synonyms;
  return parsed;
}

/** Deterministic fallback parser with intent heuristics */
function mockParseQuery(query: string, synonyms: string[] = []): SearchIntent {
  const { expandedQuery } = expandQueryWithSynonyms(query);
  const q = expandedQuery.toLowerCase();
  const intent: SearchIntent = { keywords: [], intent: query, expandedSynonyms: synonyms };

  // Event types
  const types: string[] = [];
  if (q.includes("hackathon")) types.push("HACKATHON");
  if (q.includes("workshop") || q.includes("bootcamp")) types.push("WORKSHOP");
  if (q.includes("internship") || q.includes("job") || q.includes("stipend")) types.push("INTERNSHIP");
  if (q.includes("competition") || q.includes("contest") || q.includes("challenge") || q.includes("datathon")) types.push("COMPETITION");
  if (q.includes("conference") || q.includes("summit")) types.push("CONFERENCE");
  if (q.includes("scholarship") || q.includes("grant")) types.push("SCHOLARSHIP");
  if (q.includes("certification") || q.includes("cert")) types.push("CERTIFICATION");
  if (q.includes("research") || q.includes("paper")) types.push("RESEARCH");
  if (q.includes("ai") || q.includes("machine learning")) {
    if (!types.length) types.push("HACKATHON", "COMPETITION");
  }
  intent.eventTypes = Array.from(new Set(types));

  // Skills
  const skills: string[] = [];
  const skillKeywords = [
    "python", "java", "react", "javascript", "typescript", "tensorflow",
    "pytorch", "machine learning", "data science", "cloud", "cybersecurity",
    "kotlin", "android", "figma", "ui/ux", "solidity", "web3", "blockchain",
    "linux", "sql"
  ];
  for (const sk of skillKeywords) {
    if (q.includes(sk)) skills.push(sk);
  }
  intent.skills = skills;

  // Location
  const cities = ["chennai", "bangalore", "mumbai", "delhi", "hyderabad", "pune", "kolkata", "vellore", "trichy"];
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
  if (q.includes("eee") || q.includes("electrical")) intent.department = "EEE";

  // Keywords
  const words = query.split(/\s+/).filter((w) => w.length > 2);
  intent.keywords = words.slice(0, 8);

  // Clarifying question for short queries (FR-2.5)
  if (words.length <= 2) {
    intent.clarifyingQuestion = `Are you looking for ${intent.eventTypes?.[0] ? intent.eventTypes[0].toLowerCase() + "s" : "opportunities"} in Chennai, Bangalore, or online?`;
  }

  intent.intent = `Looking for ${types.length ? types.join("/").toLowerCase() : "opportunities"} ${intent.location ? `in ${intent.location}` : ""} ${intent.isRemote ? "(remote)" : ""}`.trim();

  return intent;
}
