// lib/ai/event-quality.ts
// Event Quality Score and risk flag computation

interface EventData {
  title: string;
  description: string;
  registrationDeadline: Date;
  startAt: Date;
  location: string;
  isRemote: boolean;
  eligibility: string;
  skills: string;
  registrationUrl: string;
  organizerVerified: boolean;
}

export interface QualityResult {
  score: number;
  checks: {
    completeness: number;
    dateValidity: number;
    organizerVerification: number;
    registrationUrl: number;
    duplicateSafety: number;
    descriptionQuality: number;
    contactVerification: number;
  };
  riskFlags: string[];
  recommendations: string[];
}

export function computeEventQuality(event: EventData): QualityResult {
  const riskFlags: string[] = [];
  const recommendations: string[] = [];

  // ── Completeness (20%) ────────────────────────────────────────────────────
  const fields = [
    event.title?.trim(),
    event.description?.trim(),
    event.location?.trim() || event.isRemote,
    event.registrationUrl?.trim(),
  ];
  const filled = fields.filter(Boolean).length;
  const completeness = Math.round((filled / fields.length) * 100);
  if (completeness < 80) {
    riskFlags.push("Incomplete event information");
    recommendations.push("Fill in all required fields including location and registration URL");
  }

  // ── Date Validity (15%) ───────────────────────────────────────────────────
  const now = new Date();
  const dateValidity = event.startAt > now && event.registrationDeadline <= event.startAt ? 100 : 40;
  if (dateValidity < 80) {
    riskFlags.push("Invalid or past dates");
    recommendations.push("Verify event dates and registration deadline");
  }

  // ── Organizer Verification (20%) ──────────────────────────────────────────
  const organizerVerification = event.organizerVerified ? 100 : 40;
  if (!event.organizerVerified) {
    riskFlags.push("Organizer not verified");
    recommendations.push("Complete organizer verification to improve trust score");
  }

  // ── Registration URL (15%) ────────────────────────────────────────────────
  const registrationUrl = event.registrationUrl?.startsWith("https://") ? 100 : event.registrationUrl ? 60 : 0;
  if (registrationUrl === 0) {
    riskFlags.push("Missing registration URL");
    recommendations.push("Add a valid HTTPS registration URL");
  } else if (registrationUrl === 60) {
    riskFlags.push("Registration URL not secure (no HTTPS)");
  }

  // ── Description Quality (10%) ─────────────────────────────────────────────
  const descLen = event.description?.length || 0;
  let descriptionQuality = 0;
  if (descLen > 300) descriptionQuality = 100;
  else if (descLen > 100) descriptionQuality = 70;
  else if (descLen > 30) descriptionQuality = 40;
  else { descriptionQuality = 10; riskFlags.push("Very short or missing description"); recommendations.push("Add a detailed event description (300+ characters)"); }

  // Spam signals in description
  const spamSignals = ["click here", "limited seats", "hurry", "asap", "act now", "free certificate"];
  for (const signal of spamSignals) {
    if (event.description?.toLowerCase().includes(signal)) {
      riskFlags.push("Promotional/spam language detected");
      descriptionQuality = Math.max(0, descriptionQuality - 30);
      break;
    }
  }

  // ── Duplicate Safety (15%) ────────────────────────────────────────────────
  const duplicateSafety = 90; // Simplified — real check would do DB similarity

  // ── Contact Verification (5%) ─────────────────────────────────────────────
  const contactVerification = event.organizerVerified ? 80 : 30;

  // ── Weighted Score ────────────────────────────────────────────────────────
  const score = Math.round(
    completeness * 0.20 +
    dateValidity * 0.15 +
    organizerVerification * 0.20 +
    registrationUrl * 0.15 +
    descriptionQuality * 0.10 +
    duplicateSafety * 0.15 +
    contactVerification * 0.05
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    checks: { completeness, dateValidity, organizerVerification, registrationUrl, duplicateSafety, descriptionQuality, contactVerification },
    riskFlags,
    recommendations,
  };
}
