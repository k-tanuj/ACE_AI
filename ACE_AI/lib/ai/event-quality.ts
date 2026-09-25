// lib/ai/event-quality.ts
// AI Event Verification & Quality Scanner conforming to SRD §3.5 (FR-5.1 to FR-5.7)

export interface EventScanInput {
  id?: string;
  title: string;
  description: string;
  type: string;
  registrationDeadline: Date | string;
  startAt: Date | string;
  endAt?: Date | string | null;
  location: string;
  isRemote: boolean;
  eligibility: string;
  skills: string;
  registrationUrl: string;
  organizer?: {
    verificationStatus?: string;
    credibilityScore?: number;
  };
  reportsCount?: number;
  existingEvents?: { id: string; title: string; description: string }[];
}

export interface QualityScanResult {
  score: number;
  verdict: "AUTO_APPROVE" | "MANUAL_REVIEW" | "REJECT";
  checks: {
    completeness: number;
    organizerCredibility: number;
    descriptionQuality: number;
    verificationStatus: number;
    userReportsPenalty: number;
    duplicateSafety: number;
  };
  riskFlags: string[];
  recommendations: string[];
  duplicateCandidate?: {
    eventId: string;
    title: string;
    similarity: number;
  } | null;
}

/**
 * Calculates string token similarity (Jaccard + Levenshtein hybrid) for duplicate detection (FR-5.1)
 */
export function computeTextSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 100;

  const words1 = new Set(s1.split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(s2.split(/\s+/).filter((w) => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of Array.from(words1)) {
    if (words2.has(w)) intersection += 1;
  }

  const union = new Set([...Array.from(words1), ...Array.from(words2)]).size;
  const jaccard = (intersection / union) * 100;

  // Prefix check for titles like "HackAI Chennai 2026" vs "HackAI 2026 Chennai Edition"
  let bonus = 0;
  if (s1.slice(0, 10) === s2.slice(0, 10)) bonus = 15;

  return Math.min(100, Math.round(jaccard * 0.85 + bonus));
}

/**
 * Computes Event Quality Score conforming to SRD FR-5.4 formula:
 * quality_score = 0.30 * completeness
 *               + 0.25 * organizer_credibility
 *               + 0.20 * description_quality
 *               + 0.15 * verification_status
 *               + 0.10 * user_reports_penalty
 */
export function scanEventQuality(event: EventScanInput): QualityScanResult {
  const riskFlags: string[] = [];
  const recommendations: string[] = [];

  // 1. Completeness (30%)
  const fields = [
    Boolean(event.title?.trim()),
    Boolean(event.description?.trim()),
    Boolean(event.location?.trim() || event.isRemote),
    Boolean(event.registrationUrl?.trim()),
    Boolean(event.registrationDeadline),
    Boolean(event.startAt),
  ];
  const filled = fields.filter(Boolean).length;
  const completeness = Math.round((filled / fields.length) * 100);

  if (completeness < 80) {
    riskFlags.push("Incomplete event details (missing required fields)");
    recommendations.push("Fill in all missing fields including location, dates, and registration URL.");
  }

  // 2. Organizer Credibility (25%)
  const organizerCredibility = Math.min(
    100,
    Math.max(0, event.organizer?.credibilityScore ?? 50)
  );
  if (organizerCredibility < 60) {
    riskFlags.push("Organizer credibility is low or unestablished");
    recommendations.push("Verify organizer official email and website to raise credibility score.");
  }

  // 3. Description Quality (20%)
  const desc = (event.description || "").trim();
  let descriptionQuality = 40;

  if (desc.length >= 300) descriptionQuality = 100;
  else if (desc.length >= 150) descriptionQuality = 75;
  else if (desc.length >= 50) descriptionQuality = 50;
  else {
    descriptionQuality = 15;
    riskFlags.push("Abnormally low details in description");
    recommendations.push("Expand event description to at least 200 characters.");
  }

  // Check spam keywords (FR-5.3)
  const spamKeywords = [
    "click here", "free certificate without test", "guaranteed prize money",
    "limited seats hurry", "asap call now", "100% free money", "pay to register via whatsapp"
  ];
  for (const spam of spamKeywords) {
    if (desc.toLowerCase().includes(spam)) {
      riskFlags.push(`Suspicious/spam phrasing detected: "${spam}"`);
      descriptionQuality = Math.max(0, descriptionQuality - 35);
      break;
    }
  }

  // Check registration URL validity & security
  const regUrl = (event.registrationUrl || "").trim().toLowerCase();
  if (!regUrl) {
    riskFlags.push("Missing registration link");
  } else if (!regUrl.startsWith("https://")) {
    riskFlags.push("Insecure registration URL (requires HTTPS)");
    recommendations.push("Ensure registration link uses HTTPS protocol.");
  } else if (regUrl.includes("bit.ly") || regUrl.includes("tinyurl") || regUrl.includes("example.com")) {
    riskFlags.push("Obfuscated or placeholder registration link");
    recommendations.push("Provide direct official registration link instead of shortened URLs.");
  }

  // 4. Verification Status (15%)
  const orgStatus = event.organizer?.verificationStatus || "PENDING";
  let verificationStatus = 40;
  if (orgStatus === "VERIFIED") {
    verificationStatus = 100;
  } else if (orgStatus === "SUSPENDED") {
    verificationStatus = 0;
    riskFlags.push("Organizer account has been suspended");
  } else {
    verificationStatus = 50;
  }

  // 5. User Reports Penalty (10%)
  const reportsCount = event.reportsCount || 0;
  let userReportsPenalty = 100; // 100 means no penalty
  if (reportsCount === 1) userReportsPenalty = 70;
  else if (reportsCount === 2) userReportsPenalty = 40;
  else if (reportsCount >= 3) {
    userReportsPenalty = 0;
    riskFlags.push(`Event flagged by ${reportsCount} student reports`);
  }

  // Duplicate Check (>85% similarity match - FR-5.1)
  let duplicateSafety = 100;
  let duplicateCandidate: { eventId: string; title: string; similarity: number } | null = null;

  if (event.existingEvents && event.existingEvents.length > 0) {
    for (const existing of event.existingEvents) {
      if (existing.id === event.id) continue;
      const titleSim = computeTextSimilarity(event.title, existing.title);
      const descSim = computeTextSimilarity(event.description, existing.description);
      const overallSim = Math.round(titleSim * 0.7 + descSim * 0.3);

      if (overallSim > 85) {
        duplicateSafety = 15;
        duplicateCandidate = {
          eventId: existing.id,
          title: existing.title,
          similarity: overallSim,
        };
        riskFlags.push(`High duplicate similarity (${overallSim}%) with "${existing.title}"`);
        recommendations.push(`Review potential duplicate of event ID ${existing.id}.`);
        break;
      }
    }
  }

  // SRD FR-5.4 Exact Formula
  const rawScore =
    0.30 * completeness +
    0.25 * organizerCredibility +
    0.20 * descriptionQuality +
    0.15 * verificationStatus +
    0.10 * userReportsPenalty;

  // Apply duplicate penalty if detected
  const finalScore = duplicateCandidate
    ? Math.min(45, Math.round(rawScore * 0.5))
    : Math.min(100, Math.max(10, Math.round(rawScore)));

  // Approval insights (FR-5.6)
  let verdict: "AUTO_APPROVE" | "MANUAL_REVIEW" | "REJECT" = "MANUAL_REVIEW";
  if (finalScore >= 80 && riskFlags.length === 0) {
    verdict = "AUTO_APPROVE";
  } else if (finalScore < 50 || duplicateCandidate || orgStatus === "SUSPENDED") {
    verdict = "REJECT";
  } else {
    verdict = "MANUAL_REVIEW";
  }

  return {
    score: finalScore,
    verdict,
    checks: {
      completeness,
      organizerCredibility,
      descriptionQuality,
      verificationStatus,
      userReportsPenalty,
      duplicateSafety,
    },
    riskFlags,
    recommendations,
    duplicateCandidate,
  };
}

export const checkEventQuality = (event: EventScanInput) => {
  const result = scanEventQuality(event);
  return {
    ...result,
    overallScore: result.score,
    breakdown: result.checks,
  };
};

