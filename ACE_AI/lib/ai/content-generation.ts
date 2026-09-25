// lib/ai/content-generation.ts
// AI Content Generation Assistant conforming to SRD §3.6 (FR-6.1 to FR-6.7)

import { aiGenerateObject } from "@/lib/ai";
import { z } from "zod";

export type ContentTone = "formal" | "casual" | "energetic";

// Schema for Description generation (FR-6.1)
export const DescriptionOutputSchema = z.object({
  description: z.string(),
  shortSummary: z.string(),
  highlights: z.array(z.string()),
  recommendedSkills: z.array(z.string()),
  eligibilityNotes: z.string(),
});

export type DescriptionOutput = z.infer<typeof DescriptionOutputSchema>;

// Schema for Promotional campaign generation (FR-6.2 & FR-6.3)
export const PromoOutputSchema = z.object({
  linkedinPost: z.string(),
  twitterPost: z.string(),
  instagramCaption: z.string(),
  emailSubject: z.string(),
  emailBody: z.string(),
  departmentPitch: z.string(),
  callToAction: z.string(),
});

export type PromoOutput = z.infer<typeof PromoOutputSchema>;

export interface EventContentInput {
  title: string;
  type: string;
  organizer?: string;
  targetDepartment?: string;
  date?: string;
  location?: string;
  isRemote?: boolean;
  skills?: string[];
  tone?: ContentTone;
}

export async function generateEventDescription(
  input: EventContentInput
): Promise<DescriptionOutput> {
  const tone = input.tone || "formal";
  const prompt = `You are an AI content assistant for AllCollegeEvent.com (ACE AI).
Generate a factual, compelling event description based on these parameters:
- Title: ${input.title}
- Category: ${input.type}
- Organizer: ${input.organizer || "Verified College Organizer"}
- Target Department: ${input.targetDepartment || "Engineering & Science"}
- Date: ${input.date || "Upcoming"}
- Location: ${input.isRemote ? "Remote / Online" : input.location || "Campus Venue"}
- Skills: ${(input.skills || []).join(", ") || "Technical and problem solving"}
- Desired Tone: ${tone}

Generate:
1. description: 250-400 words detailed description structured into overview, what participants will do, and key benefits.
2. shortSummary: concise 1-2 sentence overview under 120 chars.
3. highlights: 4-6 key bullet points.
4. recommendedSkills: 3-5 technical skills.
5. eligibilityNotes: concise eligibility guidelines.

Return valid JSON adhering to schema.`;

  return aiGenerateObject({
    schema: DescriptionOutputSchema,
    prompt,
    mockFn: () => mockGenerateDescription(input, tone),
  });
}

export async function generatePromotionalContent(
  input: EventContentInput
): Promise<PromoOutput> {
  const tone = input.tone || "energetic";
  const prompt = `You are a social media and student marketing strategist for AllCollegeEvent.com.
Create high-converting promotional copy for:
- Event: ${input.title} (${input.type})
- Target Department: ${input.targetDepartment || "CSE / All Students"}
- Location: ${input.isRemote ? "Online / Remote" : input.location}
- Tone: ${tone}

Output:
1. linkedinPost: professional post with hashtags and registration callout.
2. twitterPost: punchy post under 280 chars.
3. instagramCaption: engaging visual caption with relevant hashtags.
4. emailSubject: high open-rate subject line.
5. emailBody: full email invite formatted for college students.
6. departmentPitch: specific message explaining why students of ${input.targetDepartment || "this department"} should join.
7. callToAction: short punchy CTA.

Return valid JSON adhering to schema.`;

  return aiGenerateObject({
    schema: PromoOutputSchema,
    prompt,
    mockFn: () => mockGeneratePromo(input, tone),
  });
}

function mockGenerateDescription(input: EventContentInput, tone: ContentTone): DescriptionOutput {
  const title = input.title || "InnovateX Challenge";
  const type = (input.type || "hackathon").toLowerCase();
  const loc = input.isRemote ? "online" : input.location || "campus";
  const skills = input.skills?.length ? input.skills.join(", ") : "problem solving, coding, and teamwork";

  const toneIntro =
    tone === "energetic"
      ? `Get ready to showcase your breakthrough ideas at ${title}! This high-impact ${type} is your launchpad to build the future.`
      : tone === "casual"
      ? `Join fellow students at ${title} — a hands-on ${type} designed to help you build real projects and connect with awesome peers.`
      : `${title} is a premier ${type} organized to provide students with a collaborative environment to solve real-world problems and develop production-grade solutions.`;

  return {
    description: `${toneIntro}

Hosted ${loc}, this event brings together passionate participants to ideate, prototype, and present cutting-edge solutions. Participants will collaborate across tracks covering modern technologies including ${skills}.

Throughout the event, teams will receive hands-on guidance from experienced industry mentors, attend technical checkpoints, and refine their submissions for evaluation by expert judges. Top teams and participants will be eligible for awards, certificates of distinction, and direct networking opportunities with partner organizations.

Whether you are expanding your portfolio or competing for top honors, ${title} offers an invaluable platform to accelerate your technical and leadership journey.`,
    shortSummary: `${title} — premier ${type} for student innovators ${input.isRemote ? "online" : `in ${input.location || "campus"}`}.`,
    highlights: [
      `Open to ${input.targetDepartment || "all engineering & tech"} students`,
      `Hands-on mentorship from industry practitioners`,
      `Focus areas include ${skills}`,
      "Official certificates of participation and merit",
      "Awards, recognition, and networking opportunities",
    ],
    recommendedSkills: input.skills?.length ? input.skills : ["Python", "Web Development", "AI/ML", "Team Collaboration"],
    eligibilityNotes: `Open to undergraduate and postgraduate students in ${input.targetDepartment || "relevant disciplines"}. Individual or team entries allowed.`,
  };
}

function mockGeneratePromo(input: EventContentInput, tone: ContentTone): PromoOutput {
  const title = input.title || "College Hackathon";
  const dept = input.targetDepartment || "Engineering & Technology";

  return {
    linkedinPost: `Excited to announce ${title}! 🚀

Looking to elevate your technical skills and showcase real-world projects? Join this premier ${input.type?.toLowerCase() || "opportunity"} designed for ${dept} students.

📍 Venue: ${input.isRemote ? "Remote / Online" : input.location || "On Campus"}
🎯 Key Focus: ${input.skills?.join(", ") || "Innovation & Tech"}
🔗 Register on AllCollegeEvent: https://allcollegeevent.com/events

#CollegeEvents #StudentHackathons #${input.type?.replace(/[^a-zA-Z]/g, "") || "Hackathon"} #StudentInnovation #STEM`,

    twitterPost: `Ready to build something amazing? ${title} is now open for registration! Open to ${dept} students. 🔗 Register today on @AllCollegeEvent.`,

    instagramCaption: `Calling all student creators and builders! ⚡️

${title} is officially live. Connect with mentors, build awesome projects, and compete for top prizes.

👉 Link in bio to register on AllCollegeEvent!

#StudentDev #CollegeHackathon #${input.type || "Opportunity"} #CampusLife`,

    emailSubject: `Invitation: Register for ${title} on AllCollegeEvent`,

    emailBody: `Dear Students,

We are delighted to invite you to participate in ${title}, scheduled to take place ${input.isRemote ? "virtually" : `at ${input.location || "our campus"}`}.

This is an exceptional opportunity for ${dept} students to apply theoretical knowledge to practical challenges, receive mentorship from experts, and enhance their resume with verified credentials.

Event Highlights:
- Guided mentorship sessions
- Networking with peers and industry evaluators
- Certificates and awards for finalists

Please visit the event link below to review eligibility and confirm your registration before the deadline.

Register here: https://allcollegeevent.com/events

Best regards,
Event Organizing Committee
AllCollegeEvent.com`,

    departmentPitch: `Why this matters for ${dept}: This event is tailored to address industry challenges directly aligned with your curriculum, giving you project credentials that stand out in placements and internships.`,

    callToAction: "Register now — limited participant slots available!",
  };
}
