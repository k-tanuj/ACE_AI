// lib/ai/recommendation.ts
// AI Event Recommendation Engine conforming to SRD §3.1 (FR-1.1 to FR-1.8)

import { parseJson } from "@/lib/utils";

export interface StudentProfileData {
  department?: string;
  college?: string;
  skills: string;
  interests: string;
  careerGoals: string;
  city: string;
  state: string;
  locationPref?: string;
  opportunityTypes?: string;
}

export interface EventDataForRec {
  id: string;
  title: string;
  type: string;
  description: string;
  skills: string;
  eligibility: string;
  location: string;
  isRemote: boolean;
  registrationDeadline: Date;
  qualityScore?: number;
  organizer?: {
    credibilityScore?: number;
    verificationStatus?: string;
  };
}

export interface RecommendationResult {
  score: number;
  reasons: string[];
  breakdown: {
    embeddingSimilarity: number;
    locationMatch: number;
    departmentMatch: number;
    deadlineUrgency: number;
    organizerCredibility: number;
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

/**
 * Computes token-based semantic similarity between user profile and event metadata
 */
function computeSemanticVectorSimilarity(userTerms: string[], eventText: string): number {
  if (userTerms.length === 0) return 60; // neutral cold-start baseline

  const lowerEvent = eventText.toLowerCase();
  let hits = 0;
  for (const term of userTerms) {
    const cleanTerm = term.toLowerCase().trim();
    if (!cleanTerm) continue;
    if (lowerEvent.includes(cleanTerm)) {
      hits += 1;
    }
  }

  const ratio = hits / Math.max(1, Math.min(userTerms.length, 6));
  return Math.min(100, Math.round(ratio * 100));
}

/**
 * Computes personalized score using the SRD formula:
 * score = 0.50 * embedding_similarity
 *       + 0.20 * location_match
 *       + 0.15 * department_match
 *       + 0.10 * deadline_urgency
 *       + 0.05 * organizer_credibility
 */
export function computeRecommendation(
  profile: StudentProfileData,
  event: EventDataForRec
): RecommendationResult {
  const profileSkills = parseJson<string[]>(profile.skills, []).map((s) => s.toLowerCase());
  const profileInterests = parseJson<string[]>(profile.interests, []);
  const profileGoals = parseJson<string[]>(profile.careerGoals, []);
  const eventSkills = parseJson<string[]>(event.skills, []).map((s) => s.toLowerCase());
  const eventEligibility = parseJson<string[]>(event.eligibility, []).map((e) => e.toLowerCase());
  const reasons: string[] = [];

  // 1. Embedding / Semantic Similarity (50%)
  const userTerms = [...profileSkills, ...profileInterests, ...profileGoals];
  const eventCorpus = `${event.title} ${event.type} ${event.description} ${eventSkills.join(" ")}`;
  let embeddingSimilarity = computeSemanticVectorSimilarity(userTerms, eventCorpus);

  // Bonus for explicit interest & skill overlap
  const hasInterestMatch = profileInterests.some((i) =>
    (INTEREST_TYPE_MAP[i] ?? []).includes(event.type)
  );
  if (hasInterestMatch) {
    embeddingSimilarity = Math.min(100, embeddingSimilarity + 15);
    reasons.push(`Matches your interest in ${event.type.toLowerCase()}s`);
  }

  const matchedSkills = profileSkills.filter((ps) =>
    eventSkills.some((es) => es.includes(ps) || ps.includes(es))
  );
  if (matchedSkills.length > 0) {
    embeddingSimilarity = Math.min(100, embeddingSimilarity + matchedSkills.length * 10);
    reasons.push(
      `Uses ${matchedSkills.slice(0, 2).map((s) => s.toUpperCase()).join(", ")}, which you know`
    );
  }

  // 2. Location Match (20%)
  let locationMatch = 30;
  if (event.isRemote) {
    locationMatch = 95;
    reasons.push("Available remotely");
  } else if (
    profile.city &&
    event.location.toLowerCase().includes(profile.city.toLowerCase())
  ) {
    locationMatch = 100;
    reasons.push(`Located in your city (${profile.city})`);
  } else if (
    profile.state &&
    event.location.toLowerCase().includes(profile.state.toLowerCase())
  ) {
    locationMatch = 80;
    reasons.push(`Within your state (${profile.state})`);
  }

  // 3. Department Match (15%)
  let departmentMatch = 70; // baseline eligible
  if (profile.department) {
    const dept = profile.department.toLowerCase();
    const isDeptMatched =
      eventEligibility.some((e) => e.includes(dept) || dept.includes(e) || e.includes("all")) ||
      event.description.toLowerCase().includes(dept);

    if (isDeptMatched) {
      departmentMatch = 100;
      reasons.push(`Open to ${profile.department} students`);
    } else if (eventEligibility.length === 0) {
      departmentMatch = 85;
    } else {
      departmentMatch = 40;
    }
  }

  // 4. Deadline Urgency (10%)
  const daysUntil = Math.ceil(
    (new Date(event.registrationDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  let deadlineUrgency = 50;
  if (daysUntil <= 3 && daysUntil >= 0) {
    deadlineUrgency = 100;
    reasons.push("Registration deadline ending in < 3 days");
  } else if (daysUntil <= 7) {
    deadlineUrgency = 85;
    reasons.push("Closing this week");
  } else if (daysUntil <= 14) {
    deadlineUrgency = 70;
  } else if (daysUntil <= 30) {
    deadlineUrgency = 60;
  }

  // 5. Organizer Credibility (5%)
  const organizerCredibility = event.organizer?.credibilityScore ?? (event.qualityScore || 70);

  // SRD Final Weighted Score
  const rawScore =
    0.50 * embeddingSimilarity +
    0.20 * locationMatch +
    0.15 * departmentMatch +
    0.10 * deadlineUrgency +
    0.05 * organizerCredibility;

  const score = Math.min(99, Math.max(25, Math.round(rawScore)));

  return {
    score,
    reasons: reasons.slice(0, 4),
    breakdown: {
      embeddingSimilarity,
      locationMatch,
      departmentMatch,
      deadlineUrgency,
      organizerCredibility,
    },
  };
}

/**
 * Diversity Filter (SRD §8.2):
 * Prevents recommendation feeds from being dominated by a single category
 * ensuring a balanced mix of hackathons, workshops, internships, and competitions.
 */
export function applyDiversityFilter<T extends { type: string }>(
  items: T[],
  maxConsecutiveSameType = 2
): T[] {
  if (items.length <= 2) return items;

  const result: T[] = [];
  const remaining = [...items];
  let consecutiveCount = 0;
  let lastType = "";

  while (remaining.length > 0) {
    let foundIndex = -1;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      if (item.type !== lastType || consecutiveCount < maxConsecutiveSameType) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) {
      // If all remaining are of lastType, append the next available
      foundIndex = 0;
    }

    const [chosen] = remaining.splice(foundIndex, 1);
    if (chosen.type === lastType) {
      consecutiveCount += 1;
    } else {
      lastType = chosen.type;
      consecutiveCount = 1;
    }
    result.push(chosen);
  }

  return result;
}

/**
 * Cold-start fallback recommendation logic (SRD FR-1.7)
 */
export function getColdStartDefaults(): Partial<StudentProfileData> {
  return {
    interests: JSON.stringify(["Hackathons", "Internships", "Workshops"]),
    careerGoals: JSON.stringify(["AI/ML", "Software Engineering"]),
    skills: JSON.stringify(["Python", "JavaScript", "Problem Solving"]),
    city: "Chennai",
    state: "Tamil Nadu",
  };
}
