// lib/ai/recommendation.ts
// Weighted scoring model from SRD §13

import { parseJson } from "@/lib/utils";

interface StudentProfile {
  skills: string;
  interests: string;
  careerGoals: string;
  city: string;
  state: string;
}

interface Event {
  type: string;
  skills: string;
  eligibility: string;
  location: string;
  isRemote: boolean;
  registrationDeadline: Date;
}

export interface RecommendationResult {
  score: number;
  reasons: string[];
  breakdown: {
    interest: number;
    skill: number;
    careerGoal: number;
    eligibility: number;
    location: number;
    freshness: number;
  };
}

const INTEREST_TYPE_MAP: Record<string, string[]> = {
  Hackathons: ["HACKATHON"],
  Internships: ["INTERNSHIP"],
  Workshops: ["WORKSHOP"],
  Competitions: ["COMPETITION"],
  Conferences: ["CONFERENCE"],
  Scholarships: ["SCHOLARSHIP"],
  Certifications: ["CERTIFICATION"],
  Research: ["RESEARCH"],
};

const CAREER_TYPE_MAP: Record<string, string[]> = {
  "AI/ML": ["HACKATHON", "RESEARCH", "COMPETITION", "WORKSHOP"],
  "Software Engineering": ["HACKATHON", "COMPETITION", "INTERNSHIP"],
  Data: ["COMPETITION", "RESEARCH", "WORKSHOP"],
  Cloud: ["CERTIFICATION", "WORKSHOP", "INTERNSHIP"],
  Cybersecurity: ["COMPETITION", "CERTIFICATION", "WORKSHOP"],
  Product: ["COMPETITION", "CONFERENCE", "INTERNSHIP"],
  Design: ["COMPETITION", "WORKSHOP", "INTERNSHIP"],
  Research: ["RESEARCH", "CONFERENCE", "SCHOLARSHIP"],
  Entrepreneurship: ["COMPETITION", "CONFERENCE", "SCHOLARSHIP"],
};

export function computeRecommendation(
  profile: StudentProfile,
  event: Event
): RecommendationResult {
  const profileSkills = parseJson<string[]>(profile.skills, []).map((s) => s.toLowerCase());
  const profileInterests = parseJson<string[]>(profile.interests, []);
  const profileGoals = parseJson<string[]>(profile.careerGoals, []);
  const eventSkills = parseJson<string[]>(event.skills, []).map((s) => s.toLowerCase());
  const reasons: string[] = [];

  // ── Interest Match (25%) ──────────────────────────────────────────────────
  let interestScore = 0;
  for (const interest of profileInterests) {
    const types = INTEREST_TYPE_MAP[interest] ?? [];
    if (types.includes(event.type)) {
      interestScore = 100;
      reasons.push(`Matches your ${interest} interest`);
      break;
    }
  }

  // ── Skill Match (20%) ─────────────────────────────────────────────────────
  let skillScore = 0;
  const matchedSkills: string[] = [];
  for (const ps of profileSkills) {
    if (eventSkills.some((es) => es.includes(ps) || ps.includes(es))) {
      matchedSkills.push(ps);
    }
  }
  if (matchedSkills.length > 0) {
    skillScore = Math.min(100, matchedSkills.length * 40);
    reasons.push(`Uses ${matchedSkills.slice(0, 2).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}, ${matchedSkills.length > 1 ? "skills" : "a skill"} you listed`);
  }

  // ── Career Goal Match (15%) ───────────────────────────────────────────────
  let careerScore = 0;
  for (const goal of profileGoals) {
    const types = CAREER_TYPE_MAP[goal] ?? [];
    if (types.includes(event.type)) {
      careerScore = 100;
      reasons.push(`Aligns with your ${goal} career goal`);
      break;
    }
  }

  // ── Eligibility Match (15%) ───────────────────────────────────────────────
  const eligibilityScore = 80; // Simplified: assume eligible unless explicitly excluded
  if (eligibilityScore > 60) reasons.push("You meet the eligibility requirements");

  // ── Location Match (10%) ──────────────────────────────────────────────────
  let locationScore = 0;
  if (event.isRemote) {
    locationScore = 90;
    reasons.push("Available remotely");
  } else if (event.location.toLowerCase().includes(profile.city.toLowerCase()) || event.location.toLowerCase().includes(profile.state.toLowerCase())) {
    locationScore = 100;
    reasons.push(`Near your location in ${profile.city}`);
  } else {
    locationScore = 30;
  }

  // ── Freshness (5%) ────────────────────────────────────────────────────────
  const daysUntilDeadline = Math.ceil((event.registrationDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const freshnessScore = daysUntilDeadline > 30 ? 100 : daysUntilDeadline > 7 ? 75 : daysUntilDeadline > 0 ? 50 : 0;

  // ── Weighted total ────────────────────────────────────────────────────────
  const score = Math.round(
    interestScore * 0.25 +
    skillScore * 0.20 +
    careerScore * 0.15 +
    eligibilityScore * 0.15 +
    locationScore * 0.10 +
    80 * 0.10 + // activity similarity (simplified)
    freshnessScore * 0.05
  );

  return {
    score: Math.min(99, Math.max(20, score)),
    reasons: reasons.slice(0, 4),
    breakdown: {
      interest: interestScore,
      skill: skillScore,
      careerGoal: careerScore,
      eligibility: eligibilityScore,
      location: locationScore,
      freshness: freshnessScore,
    },
  };
}
