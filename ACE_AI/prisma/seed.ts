// prisma/seed.ts — ACE AI Demo Data
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, addHours } from "date-fns";

const Role = {
  STUDENT: "STUDENT",
  ORGANIZER: "ORGANIZER",
  ADMIN: "ADMIN",
} as const;

const EventType = {
  HACKATHON: "HACKATHON",
  COMPETITION: "COMPETITION",
  WORKSHOP: "WORKSHOP",
  INTERNSHIP: "INTERNSHIP",
  CONFERENCE: "CONFERENCE",
  SCHOLARSHIP: "SCHOLARSHIP",
  CERTIFICATION: "CERTIFICATION",
  RESEARCH: "RESEARCH",
} as const;

const EventStatus = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NEEDS_CHANGES: "NEEDS_CHANGES",
  DUPLICATE: "DUPLICATE",
} as const;

const OrganizerStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  SUSPENDED: "SUSPENDED",
} as const;

const Priority = {
  URGENT: "URGENT",
  IMPORTANT: "IMPORTANT",
  NORMAL: "NORMAL",
} as const;

const NotificationType = {
  DEADLINE_APPROACHING: "DEADLINE_APPROACHING",
  NEW_RECOMMENDATION: "NEW_RECOMMENDATION",
  BADGE_EARNED: "BADGE_EARNED",
  CHALLENGE_REMINDER: "CHALLENGE_REMINDER",
} as const;

const prisma = new PrismaClient();
const now = new Date();

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(v: unknown) {
  return JSON.stringify(v);
}

function slug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding ACE AI database...");

  // ── Badges ─────────────────────────────────────────────────────────────────
  const badges = await Promise.all([
    prisma.badge.upsert({ where: { name: "Profile Complete" }, update: {}, create: { name: "Profile Complete", description: "Completed your student profile", icon: "user-check", color: "#20A46B", criteria: json({ type: "profile_completion", threshold: 100 }) } }),
    prisma.badge.upsert({ where: { name: "Early Explorer" }, update: {}, create: { name: "Early Explorer", description: "First to explore opportunities", icon: "compass", color: "#7C5CFF", criteria: json({ type: "events_viewed", threshold: 5 }) } }),
    prisma.badge.upsert({ where: { name: "First Application" }, update: {}, create: { name: "First Application", description: "Applied to your first opportunity", icon: "send", color: "#4E8FF7", criteria: json({ type: "applications", threshold: 1 }) } }),
    prisma.badge.upsert({ where: { name: "7-Day Streak" }, update: {}, create: { name: "7-Day Streak", description: "Logged in 7 days in a row", icon: "flame", color: "#E6A72E", criteria: json({ type: "streak", threshold: 7 }) } }),
    prisma.badge.upsert({ where: { name: "AI Explorer" }, update: {}, create: { name: "AI Explorer", description: "Used ACE Chat 10+ times", icon: "bot", color: "#6D4BEA", criteria: json({ type: "chat_queries", threshold: 10 }) } }),
    prisma.badge.upsert({ where: { name: "Opportunity Hunter" }, update: {}, create: { name: "Opportunity Hunter", description: "Saved 10+ opportunities", icon: "bookmark", color: "#D9536F", criteria: json({ type: "saved_events", threshold: 10 }) } }),
    prisma.badge.upsert({ where: { name: "Community Contributor" }, update: {}, create: { name: "Community Contributor", description: "Reported an invalid event", icon: "flag", color: "#20A46B", criteria: json({ type: "reports", threshold: 1 }) } }),
    prisma.badge.upsert({ where: { name: "Onboarding Complete" }, update: {}, create: { name: "Onboarding Complete", description: "Finished student onboarding", icon: "graduation-cap", color: "#7C5CFF", criteria: json({ type: "onboarding", threshold: 1 }) } }),
  ]);

  // ── Challenges ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.challenge.upsert({ where: { id: "ch-daily-1" }, update: {}, create: { id: "ch-daily-1", title: "Explore 5 Opportunities", description: "View 5 different events today", type: "DAILY", target: 5, xpReward: 50, icon: "search", startAt: now, endAt: addDays(now, 1) } }),
    prisma.challenge.upsert({ where: { id: "ch-daily-2" }, update: {}, create: { id: "ch-daily-2", title: "Save 3 Events", description: "Bookmark 3 relevant opportunities", type: "DAILY", target: 3, xpReward: 30, icon: "bookmark", startAt: now, endAt: addDays(now, 1) } }),
    prisma.challenge.upsert({ where: { id: "ch-weekly-1" }, update: {}, create: { id: "ch-weekly-1", title: "Ask ACE Chat", description: "Ask ACE Chat for an opportunity recommendation", type: "WEEKLY", target: 1, xpReward: 50, icon: "message-circle", startAt: now, endAt: addDays(now, 7) } }),
    prisma.challenge.upsert({ where: { id: "ch-weekly-2" }, update: {}, create: { id: "ch-weekly-2", title: "Apply to an Opportunity", description: "Apply to one event this week", type: "WEEKLY", target: 1, xpReward: 80, icon: "send", startAt: now, endAt: addDays(now, 7) } }),
    prisma.challenge.upsert({ where: { id: "ch-weekly-3" }, update: {}, create: { id: "ch-weekly-3", title: "Complete Your Profile", description: "Reach 100% profile completion", type: "WEEKLY", target: 100, xpReward: 100, icon: "user-check", startAt: now, endAt: addDays(now, 7) } }),
  ]);

  // ── Organizer Users ────────────────────────────────────────────────────────
  const orgPassword = await bcrypt.hash("demo1234", 10);

  const orgUsers = await Promise.all([
    prisma.user.upsert({ where: { email: "organizer@demo.ace" }, update: {}, create: { email: "organizer@demo.ace", name: "Demo Organizer", password: orgPassword, role: Role.ORGANIZER } }),
    prisma.user.upsert({ where: { email: "mit-tech@demo.ace" }, update: {}, create: { email: "mit-tech@demo.ace", name: "MIT TechFest Team", password: orgPassword, role: Role.ORGANIZER } }),
    prisma.user.upsert({ where: { email: "iit-bombay@demo.ace" }, update: {}, create: { email: "iit-bombay@demo.ace", name: "IIT Bombay E-Cell", password: orgPassword, role: Role.ORGANIZER } }),
    prisma.user.upsert({ where: { email: "nasscom@demo.ace" }, update: {}, create: { email: "nasscom@demo.ace", name: "NASSCOM Foundation", password: orgPassword, role: Role.ORGANIZER } }),
    prisma.user.upsert({ where: { email: "devfolio@demo.ace" }, update: {}, create: { email: "devfolio@demo.ace", name: "Devfolio Platform", password: orgPassword, role: Role.ORGANIZER } }),
    prisma.user.upsert({ where: { email: "google-dsc@demo.ace" }, update: {}, create: { email: "google-dsc@demo.ace", name: "Google Developer Student Clubs", password: orgPassword, role: Role.ORGANIZER } }),
  ]);

  // ── Organizer Profiles ─────────────────────────────────────────────────────
  const organizers = await Promise.all([
    prisma.organizer.upsert({ where: { userId: orgUsers[0].id }, update: {}, create: { userId: orgUsers[0].id, name: "Demo Organizer", website: "https://demo.ace", description: "Demo organizer account", verificationStatus: OrganizerStatus.VERIFIED, credibilityScore: 72 } }),
    prisma.organizer.upsert({ where: { userId: orgUsers[1].id }, update: {}, create: { userId: orgUsers[1].id, name: "MIT TechFest", website: "https://techfest.org", description: "Asia's largest Science and Technology Festival hosted by IIT Bombay", verificationStatus: OrganizerStatus.VERIFIED, credibilityScore: 96 } }),
    prisma.organizer.upsert({ where: { userId: orgUsers[2].id }, update: {}, create: { userId: orgUsers[2].id, name: "IIT Bombay E-Cell", website: "https://ecell.in", description: "Entrepreneurship Cell of IIT Bombay — fostering the startup ecosystem", verificationStatus: OrganizerStatus.VERIFIED, credibilityScore: 94 } }),
    prisma.organizer.upsert({ where: { userId: orgUsers[3].id }, update: {}, create: { userId: orgUsers[3].id, name: "NASSCOM Foundation", website: "https://nasscom.in", description: "India's premier tech industry association supporting student innovation", verificationStatus: OrganizerStatus.VERIFIED, credibilityScore: 91 } }),
    prisma.organizer.upsert({ where: { userId: orgUsers[4].id }, update: {}, create: { userId: orgUsers[4].id, name: "Devfolio", website: "https://devfolio.co", description: "India's leading hackathon platform for developers", verificationStatus: OrganizerStatus.VERIFIED, credibilityScore: 88 } }),
    prisma.organizer.upsert({ where: { userId: orgUsers[5].id }, update: {}, create: { userId: orgUsers[5].id, name: "Google DSC", website: "https://developers.google.com/community/gdsc", description: "Google Developer Student Clubs — campus communities for student developers", verificationStatus: OrganizerStatus.VERIFIED, credibilityScore: 93 } }),
  ]);

  // ── Events ─────────────────────────────────────────────────────────────────
  const eventTemplates = [
    // AI/ML Hackathons
    {
      organizerId: organizers[4].id,
      title: "HackAI Chennai 2026",
      type: EventType.HACKATHON,
      description: "India's premier AI hackathon in Chennai. Build AI-powered solutions addressing real-world problems in healthcare, education, and sustainability. Open to all CSE, IT, and EEE students. Prize pool: ₹5 Lakhs.",
      shortSummary: "Premier AI hackathon in Chennai with ₹5L prize pool",
      startAt: addDays(now, 12),
      endAt: addDays(now, 13),
      registrationDeadline: addDays(now, 7),
      location: "Chennai, Tamil Nadu",
      isRemote: false,
      eligibility: json(["CSE", "IT", "EEE", "AI/ML students", "1st to 4th year"]),
      skills: json(["Python", "Machine Learning", "TensorFlow", "PyTorch", "Computer Vision"]),
      registrationUrl: "https://devfolio.co/hackai-chennai-2026",
      status: EventStatus.APPROVED,
      qualityScore: 92,
      bannerColor: "#7C5CFF",
    },
    {
      organizerId: organizers[1].id,
      title: "TechFest AI Challenge 2026",
      type: EventType.COMPETITION,
      description: "TechFest's flagship AI challenge where participants design and implement cutting-edge machine learning models. Compete in tracks: Computer Vision, NLP, and Reinforcement Learning. International participation welcome.",
      shortSummary: "TechFest flagship AI competition — international participation",
      startAt: addDays(now, 18),
      endAt: addDays(now, 20),
      registrationDeadline: addDays(now, 10),
      location: "IIT Bombay, Mumbai",
      isRemote: false,
      eligibility: json(["Undergraduate", "Postgraduate", "All departments with AI/ML interest"]),
      skills: json(["Deep Learning", "Python", "Data Science", "Scikit-learn", "Keras"]),
      registrationUrl: "https://techfest.org/competitions/ai-challenge",
      status: EventStatus.APPROVED,
      qualityScore: 97,
      bannerColor: "#5B3CC4",
    },
    {
      organizerId: organizers[5].id,
      title: "Google DSC AI Bootcamp — Chennai",
      type: EventType.WORKSHOP,
      description: "3-day intensive AI bootcamp by Google Developer Student Clubs Chennai. Learn TensorFlow, build real AI apps, and get mentored by Google engineers. Covers ML fundamentals to deployment.",
      shortSummary: "3-day Google AI bootcamp with TensorFlow + real app building",
      startAt: addDays(now, 8),
      endAt: addDays(now, 10),
      registrationDeadline: addDays(now, 5),
      location: "SRM Institute, Chennai",
      isRemote: false,
      eligibility: json(["CSE students", "2nd and 3rd year", "Basic Python knowledge required"]),
      skills: json(["Python", "TensorFlow", "Machine Learning", "Google Cloud"]),
      registrationUrl: "https://gdsc.community.dev/events/ai-bootcamp-chennai",
      status: EventStatus.APPROVED,
      qualityScore: 88,
      bannerColor: "#4E8FF7",
    },
    // Remote Internships
    {
      organizerId: organizers[3].id,
      title: "NASSCOM AI Research Internship 2026",
      type: EventType.INTERNSHIP,
      description: "6-month paid internship with NASSCOM's AI research division. Work on real AI projects impacting millions. Stipend: ₹25,000/month. Remote-friendly with monthly meetups in Bangalore.",
      shortSummary: "6-month paid AI research internship — ₹25K/month stipend",
      startAt: addDays(now, 30),
      endAt: addDays(now, 210),
      registrationDeadline: addDays(now, 20),
      location: "Remote (Bangalore meetups)",
      isRemote: true,
      eligibility: json(["3rd/4th year", "CSE/IT/AI programs", "CGPA > 7.5", "Portfolio required"]),
      skills: json(["Python", "Machine Learning", "Data Science", "Research", "Academic writing"]),
      registrationUrl: "https://nasscom.in/internships/ai-research-2026",
      status: EventStatus.APPROVED,
      qualityScore: 90,
      bannerColor: "#20A46B",
    },
    {
      organizerId: organizers[4].id,
      title: "Devfolio Engineering Internship",
      type: EventType.INTERNSHIP,
      description: "Join Devfolio's engineering team for a 3-month internship. Work on India's largest hackathon platform. Stack: React, Node.js, PostgreSQL. Fully remote. Stipend: ₹20,000/month.",
      shortSummary: "Remote internship at India's leading hackathon platform",
      startAt: addDays(now, 25),
      endAt: addDays(now, 115),
      registrationDeadline: addDays(now, 15),
      location: "Remote",
      isRemote: true,
      eligibility: json(["2nd-4th year", "CSE/IT", "React or Node experience"]),
      skills: json(["React", "Node.js", "TypeScript", "PostgreSQL", "REST APIs"]),
      registrationUrl: "https://devfolio.co/careers/engineering-intern",
      status: EventStatus.APPROVED,
      qualityScore: 85,
      bannerColor: "#6D4BEA",
    },
    // Workshops
    {
      organizerId: organizers[5].id,
      title: "Cloud & ML on Google Cloud — Webinar",
      type: EventType.WORKSHOP,
      description: "Free online workshop covering Google Cloud AI services: AutoML, Vertex AI, BigQuery ML. Build and deploy a real ML model in 4 hours. Certificate provided. Open to all.",
      shortSummary: "Free Google Cloud AI workshop — Vertex AI, AutoML, certificate",
      startAt: addDays(now, 5),
      endAt: addHours(addDays(now, 5), 4),
      registrationDeadline: addDays(now, 4),
      location: "Online",
      isRemote: true,
      eligibility: json(["All years", "All departments", "Basic Python required"]),
      skills: json(["Google Cloud", "Python", "Machine Learning", "Vertex AI"]),
      registrationUrl: "https://gdsc.community.dev/events/cloud-ml-webinar",
      status: EventStatus.APPROVED,
      qualityScore: 82,
      bannerColor: "#4E8FF7",
    },
    {
      organizerId: organizers[2].id,
      title: "Entrepreneurship Summit E-Cell IIT Bombay",
      type: EventType.CONFERENCE,
      description: "Annual entrepreneurship summit by IIT Bombay E-Cell. 2 days of keynotes, workshops, startup pitching competitions, and networking with 200+ investors and 500+ founders.",
      shortSummary: "Annual IIT Bombay E-Cell summit — keynotes, pitching, networking",
      startAt: addDays(now, 22),
      endAt: addDays(now, 23),
      registrationDeadline: addDays(now, 14),
      location: "IIT Bombay, Mumbai",
      isRemote: false,
      eligibility: json(["All students", "Young entrepreneurs", "Startup founders"]),
      skills: json(["Entrepreneurship", "Product Management", "Business Development", "Leadership"]),
      registrationUrl: "https://ecell.in/summit",
      status: EventStatus.APPROVED,
      qualityScore: 95,
      bannerColor: "#E6A72E",
    },
    // Cybersecurity
    {
      organizerId: organizers[4].id,
      title: "CyberHack India 2026",
      type: EventType.HACKATHON,
      description: "India's biggest Capture The Flag (CTF) competition for cybersecurity enthusiasts. Challenges across Web Exploitation, Reverse Engineering, Cryptography, Forensics, and OSINT. Beginner and advanced tracks.",
      shortSummary: "India's biggest CTF — web exploit, reverse engineering, crypto",
      startAt: addDays(now, 15),
      endAt: addDays(now, 16),
      registrationDeadline: addDays(now, 10),
      location: "Online",
      isRemote: true,
      eligibility: json(["All years", "CSE/IT/Electronics", "Beginner and advanced tracks"]),
      skills: json(["Cybersecurity", "Linux", "Python", "Networking", "Cryptography"]),
      registrationUrl: "https://devfolio.co/cyberhack-india-2026",
      status: EventStatus.APPROVED,
      qualityScore: 87,
      bannerColor: "#D9536F",
    },
    // Scholarships
    {
      organizerId: organizers[3].id,
      title: "NASSCOM Women in Tech Scholarship 2026",
      type: EventType.SCHOLARSHIP,
      description: "Scholarship for women pursuing technology careers. Covers tuition, mentorship, and placement support. ₹1 Lakh per year for 2 years. Open to 3rd year women students in CS/IT/Engineering.",
      shortSummary: "₹1L/year scholarship for women in tech — tuition + mentorship",
      startAt: addDays(now, 45),
      endAt: addDays(now, 45),
      registrationDeadline: addDays(now, 30),
      location: "Pan India",
      isRemote: true,
      eligibility: json(["Women students only", "3rd year", "CS/IT/Engineering", "CGPA > 8.0"]),
      skills: json(["Any technical skill", "Leadership", "Communication"]),
      registrationUrl: "https://nasscom.in/scholarships/women-in-tech-2026",
      status: EventStatus.APPROVED,
      qualityScore: 93,
      bannerColor: "#D9536F",
    },
    // Certifications
    {
      organizerId: organizers[5].id,
      title: "Google Associate Cloud Engineer Certification Prep",
      type: EventType.CERTIFICATION,
      description: "Free 30-day certification prep program for Google Associate Cloud Engineer. Includes guided Qwiklabs, practice exams, and study sessions with GDSC mentors. Voucher provided on completion.",
      shortSummary: "Free 30-day Google Cloud cert prep — voucher on completion",
      startAt: addDays(now, 3),
      endAt: addDays(now, 33),
      registrationDeadline: addDays(now, 2),
      location: "Online",
      isRemote: true,
      eligibility: json(["All years", "Some cloud or Linux experience preferred"]),
      skills: json(["Google Cloud", "Linux", "Networking", "DevOps"]),
      registrationUrl: "https://gdsc.community.dev/certifications/ace-prep",
      status: EventStatus.APPROVED,
      qualityScore: 86,
      bannerColor: "#20A46B",
    },
    // Data Science
    {
      organizerId: organizers[3].id,
      title: "Data Science for Social Good — Datathon",
      type: EventType.COMPETITION,
      description: "Use data science to solve real social challenges. Datasets from NGOs, government, and healthcare providers. 48-hour online datathon. Prizes: ₹2L + internship opportunities with NASSCOM partners.",
      shortSummary: "48-hour datathon for social impact — real NGO/gov datasets",
      startAt: addDays(now, 20),
      endAt: addDays(now, 22),
      registrationDeadline: addDays(now, 16),
      location: "Online",
      isRemote: true,
      eligibility: json(["All departments", "Teams of 2-4", "Data analysis background"]),
      skills: json(["Python", "Data Science", "SQL", "Visualization", "Statistics"]),
      registrationUrl: "https://nasscom.in/datathon-2026",
      status: EventStatus.APPROVED,
      qualityScore: 89,
      bannerColor: "#4E8FF7",
    },
    // Research
    {
      organizerId: organizers[1].id,
      title: "TechFest Research Paper Competition",
      type: EventType.RESEARCH,
      description: "Present your research at Asia's largest science festival. Categories: AI/ML, Robotics, Biotech, and Sustainability. Top papers presented at IIT Bombay. Publication support for winners.",
      shortSummary: "Present AI/ML research at Asia's largest science festival",
      startAt: addDays(now, 35),
      endAt: addDays(now, 36),
      registrationDeadline: addDays(now, 21),
      location: "IIT Bombay, Mumbai",
      isRemote: false,
      eligibility: json(["UG/PG/PhD students", "Faculty co-author allowed", "Original research required"]),
      skills: json(["Research", "Academic writing", "ML/AI knowledge", "Data analysis"]),
      registrationUrl: "https://techfest.org/competitions/research-paper",
      status: EventStatus.APPROVED,
      qualityScore: 91,
      bannerColor: "#5B3CC4",
    },
    // Pending/Suspicious for admin demo
    {
      organizerId: organizers[0].id,
      title: "Free AI Course with Certificate",
      type: EventType.CERTIFICATION,
      description: "Get certified in AI in just 2 days! No prior knowledge required. 100% free. Click here to register now. Limited seats. Apply ASAP!",
      shortSummary: "Suspicious: vague AI certification with spam signals",
      startAt: addDays(now, 3),
      endAt: addDays(now, 5),
      registrationDeadline: addDays(now, 1),
      location: "Online",
      isRemote: true,
      eligibility: json(["Anyone"]),
      skills: json([]),
      registrationUrl: "https://free-ai-cert-click.example.com",
      status: EventStatus.PENDING,
      qualityScore: 22,
      bannerColor: "#E6A72E",
    },
    // Duplicate candidate for admin demo
    {
      organizerId: organizers[0].id,
      title: "HackAI 2026 Chennai Edition",
      type: EventType.HACKATHON,
      description: "AI hackathon in Chennai this month. Build AI solutions and win prizes. Open to all CSE students.",
      shortSummary: "Possible duplicate of HackAI Chennai 2026",
      startAt: addDays(now, 12),
      endAt: addDays(now, 13),
      registrationDeadline: addDays(now, 7),
      location: "Chennai",
      isRemote: false,
      eligibility: json(["CSE students"]),
      skills: json(["Python", "Machine Learning"]),
      registrationUrl: "https://hackai-chennai.example.com",
      status: EventStatus.PENDING,
      qualityScore: 48,
      bannerColor: "#7C5CFF",
    },
    // More approved events for variety
    {
      organizerId: organizers[2].id,
      title: "Startup Ideathon — Social Impact 2026",
      type: EventType.COMPETITION,
      description: "Pitch your startup idea to solve a social problem. Mentorship from serial entrepreneurs, investors, and IIT faculty. Top 10 teams get ₹50K seed funding and 3-month incubation support.",
      shortSummary: "Pitch social-impact startup ideas — seed funding + incubation",
      startAt: addDays(now, 28),
      endAt: addDays(now, 28),
      registrationDeadline: addDays(now, 18),
      location: "IIT Bombay, Mumbai",
      isRemote: false,
      eligibility: json(["All students", "Teams of 1-5", "Any department"]),
      skills: json(["Entrepreneurship", "Product Design", "Business Model", "Presentation"]),
      registrationUrl: "https://ecell.in/ideathon",
      status: EventStatus.APPROVED,
      qualityScore: 88,
      bannerColor: "#E6A72E",
    },
    {
      organizerId: organizers[5].id,
      title: "Android App Dev Workshop — GDSC",
      type: EventType.WORKSHOP,
      description: "Build your first production Android app using Jetpack Compose and Kotlin. Learn MVVM architecture, Firebase integration, and Play Store deployment. 2-day hands-on workshop with certificate.",
      shortSummary: "Android + Jetpack Compose 2-day hands-on workshop + cert",
      startAt: addDays(now, 9),
      endAt: addDays(now, 10),
      registrationDeadline: addDays(now, 7),
      location: "VIT Chennai",
      isRemote: false,
      eligibility: json(["CSE/IT students", "Any year", "Laptop required"]),
      skills: json(["Kotlin", "Android", "Firebase", "Mobile Development"]),
      registrationUrl: "https://gdsc.community.dev/events/android-workshop",
      status: EventStatus.APPROVED,
      qualityScore: 83,
      bannerColor: "#4E8FF7",
    },
    {
      organizerId: organizers[3].id,
      title: "UI/UX Design Sprint — Remote",
      type: EventType.COMPETITION,
      description: "72-hour remote design sprint. Design a mobile app solving a real user problem. Judged on research, UI quality, usability, and presentation. Tools: Figma. Open to all design and CS students.",
      shortSummary: "72-hour remote Figma design sprint — UX research to prototype",
      startAt: addDays(now, 14),
      endAt: addDays(now, 17),
      registrationDeadline: addDays(now, 11),
      location: "Remote",
      isRemote: true,
      eligibility: json(["All students", "Individual or team of 2", "Figma access required"]),
      skills: json(["UI/UX", "Figma", "User Research", "Prototyping"]),
      registrationUrl: "https://nasscom.in/design-sprint-2026",
      status: EventStatus.APPROVED,
      qualityScore: 87,
      bannerColor: "#D9536F",
    },
    {
      organizerId: organizers[4].id,
      title: "Blockchain Dev Challenge",
      type: EventType.HACKATHON,
      description: "Build decentralized applications on Ethereum or Solana. Tracks: DeFi, NFT marketplace, and Web3 social. Expert mentors from top blockchain companies. Prize: ₹3L + VC introductions.",
      shortSummary: "Web3 hackathon — DeFi, NFTs, Solana/Ethereum, ₹3L prizes",
      startAt: addDays(now, 25),
      endAt: addDays(now, 26),
      registrationDeadline: addDays(now, 18),
      location: "Bangalore",
      isRemote: false,
      eligibility: json(["CSE/IT", "2nd-4th year", "Some coding experience"]),
      skills: json(["Solidity", "Ethereum", "JavaScript", "Web3.js", "Rust"]),
      registrationUrl: "https://devfolio.co/blockchain-dev-challenge",
      status: EventStatus.APPROVED,
      qualityScore: 84,
      bannerColor: "#6D4BEA",
    },
    {
      organizerId: organizers[1].id,
      title: "Robotics & Automation Summit",
      type: EventType.CONFERENCE,
      description: "Annual summit on robotics, automation, and Industry 4.0. Speakers from Boston Dynamics, ISRO, and leading robotics startups. Student paper presentations, live demos, and networking sessions.",
      shortSummary: "Annual robotics/automation summit — ISRO, Boston Dynamics speakers",
      startAt: addDays(now, 40),
      endAt: addDays(now, 41),
      registrationDeadline: addDays(now, 28),
      location: "IIT Bombay, Mumbai",
      isRemote: false,
      eligibility: json(["All engineering students", "Faculty encouraged"]),
      skills: json(["Robotics", "Embedded Systems", "Python", "ROS", "Arduino"]),
      registrationUrl: "https://techfest.org/robotics-summit",
      status: EventStatus.APPROVED,
      qualityScore: 94,
      bannerColor: "#5B3CC4",
    },
    {
      organizerId: organizers[2].id,
      title: "FinTech Innovation Challenge",
      type: EventType.COMPETITION,
      description: "Build fintech solutions for financial inclusion in India. Partner banks provide APIs and real transaction data (anonymized). Prizes: ₹4L + 6-month incubation at IIT Bombay.",
      shortSummary: "Fintech challenge with real bank APIs — ₹4L + incubation",
      startAt: addDays(now, 32),
      endAt: addDays(now, 33),
      registrationDeadline: addDays(now, 22),
      location: "Mumbai",
      isRemote: false,
      eligibility: json(["All departments", "Teams of 3-5", "Finance or tech background"]),
      skills: json(["Python", "REST APIs", "Data Analysis", "Finance", "Product Design"]),
      registrationUrl: "https://ecell.in/fintech-challenge",
      status: EventStatus.APPROVED,
      qualityScore: 90,
      bannerColor: "#20A46B",
    },
    // Needs changes for admin demo
    {
      organizerId: organizers[0].id,
      title: "Web Dev Bootcamp",
      type: EventType.WORKSHOP,
      description: "Learn web development.",
      shortSummary: "Incomplete event needing more details",
      startAt: addDays(now, 20),
      endAt: addDays(now, 22),
      registrationDeadline: addDays(now, 15),
      location: "",
      isRemote: false,
      eligibility: json([]),
      skills: json(["HTML", "CSS"]),
      registrationUrl: "",
      status: EventStatus.NEEDS_CHANGES,
      qualityScore: 35,
      bannerColor: "#E6A72E",
    },
  ];

  const events: Awaited<ReturnType<typeof prisma.event.create>>[] = [];
  for (const t of eventTemplates) {
    const e = await prisma.event.create({
      data: { ...t, slug: slug(t.title) },
    });
    events.push(e);
  }

  // ── Event Verifications ────────────────────────────────────────────────────
  for (const e of events.slice(0, 12)) {
    await prisma.eventVerification.upsert({
      where: { eventId: e.id },
      update: {},
      create: {
        eventId: e.id,
        qualityScore: e.qualityScore,
        checks: json({
          completeness: e.qualityScore > 80 ? 95 : 60,
          dateValidity: 100,
          organizerVerification: 90,
          registrationUrl: e.registrationUrl ? 100 : 0,
          duplicateSafety: 100,
          descriptionQuality: e.qualityScore > 80 ? 85 : 40,
        }),
        riskFlags: json(e.qualityScore < 50 ? ["Vague description", "Missing contact info"] : []),
        recommendations: json(e.qualityScore < 80 ? ["Add more details to description", "Include contact information"] : []),
      },
    });
  }

  // ── Demo Student Accounts ──────────────────────────────────────────────────
  const studentPassword = await bcrypt.hash("demo1234", 10);

  const studentUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: "student@demo.ace" },
      update: {},
      create: { email: "student@demo.ace", name: "Arjun Sharma", password: studentPassword, role: Role.STUDENT },
    }),
    prisma.user.upsert({
      where: { email: "priya@demo.ace" },
      update: {},
      create: { email: "priya@demo.ace", name: "Priya Nair", password: studentPassword, role: Role.STUDENT },
    }),
    prisma.user.upsert({
      where: { email: "ravi@demo.ace" },
      update: {},
      create: { email: "ravi@demo.ace", name: "Ravi Kumar", password: studentPassword, role: Role.STUDENT },
    }),
  ]);

  // ── Student Profiles ───────────────────────────────────────────────────────
  await Promise.all([
    prisma.studentProfile.upsert({
      where: { userId: studentUsers[0].id },
      update: {},
      create: {
        userId: studentUsers[0].id,
        college: "Anna University, Chennai",
        department: "Computer Science & Engineering",
        graduationYear: 2027,
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
        skills: json(["Python", "Machine Learning", "React", "Node.js", "TensorFlow"]),
        interests: json(["Hackathons", "Internships", "Workshops", "Competitions"]),
        careerGoals: json(["AI/ML", "Software Engineering", "Research"]),
        locationPref: json(["remote", "Chennai", "Bangalore"]),
        opportunityTypes: json(["HACKATHON", "INTERNSHIP", "WORKSHOP", "COMPETITION"]),
        notifFrequency: "DAILY",
        profileCompletion: 90,
        onboardingDone: true,
      },
    }),
    prisma.studentProfile.upsert({
      where: { userId: studentUsers[1].id },
      update: {},
      create: {
        userId: studentUsers[1].id,
        college: "NIT Trichy",
        department: "Information Technology",
        graduationYear: 2026,
        city: "Trichy",
        state: "Tamil Nadu",
        country: "India",
        skills: json(["UI/UX", "Figma", "React", "JavaScript", "User Research"]),
        interests: json(["Workshops", "Internships", "Scholarships"]),
        careerGoals: json(["Design", "Product", "Software Engineering"]),
        locationPref: json(["remote", "Chennai", "Mumbai"]),
        opportunityTypes: json(["WORKSHOP", "INTERNSHIP", "SCHOLARSHIP", "COMPETITION"]),
        notifFrequency: "WEEKLY",
        profileCompletion: 80,
        onboardingDone: true,
      },
    }),
    prisma.studentProfile.upsert({
      where: { userId: studentUsers[2].id },
      update: {},
      create: {
        userId: studentUsers[2].id,
        college: "VIT Vellore",
        department: "Computer Science & Engineering",
        graduationYear: 2028,
        city: "Vellore",
        state: "Tamil Nadu",
        country: "India",
        skills: json(["C++", "Cybersecurity", "Linux", "Python", "Networking"]),
        interests: json(["Competitions", "Certifications", "Research"]),
        careerGoals: json(["Cybersecurity", "Cloud", "Research"]),
        locationPref: json(["remote"]),
        opportunityTypes: json(["COMPETITION", "CERTIFICATION", "RESEARCH"]),
        notifFrequency: "DAILY",
        profileCompletion: 70,
        onboardingDone: true,
      },
    }),
  ]);

  // ── Gamification Profiles ──────────────────────────────────────────────────
  await Promise.all([
    prisma.gamificationProfile.upsert({
      where: { userId: studentUsers[0].id },
      update: {},
      create: { userId: studentUsers[0].id, xp: 340, level: 2, currentStreak: 5, longestStreak: 12, weeklyXp: 120, monthlyXp: 340 },
    }),
    prisma.gamificationProfile.upsert({
      where: { userId: studentUsers[1].id },
      update: {},
      create: { userId: studentUsers[1].id, xp: 180, level: 1, currentStreak: 2, longestStreak: 5, weeklyXp: 60, monthlyXp: 180 },
    }),
    prisma.gamificationProfile.upsert({
      where: { userId: studentUsers[2].id },
      update: {},
      create: { userId: studentUsers[2].id, xp: 520, level: 3, currentStreak: 8, longestStreak: 15, weeklyXp: 200, monthlyXp: 520 },
    }),
  ]);

  // ── User Badges ────────────────────────────────────────────────────────────
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: studentUsers[0].id } });
  if (studentProfile) {
    await Promise.all([
      prisma.userBadge.upsert({ where: { userId_badgeId: { userId: studentUsers[0].id, badgeId: badges[0].id } }, update: {}, create: { userId: studentUsers[0].id, badgeId: badges[0].id } }),
      prisma.userBadge.upsert({ where: { userId_badgeId: { userId: studentUsers[0].id, badgeId: badges[1].id } }, update: {}, create: { userId: studentUsers[0].id, badgeId: badges[1].id } }),
      prisma.userBadge.upsert({ where: { userId_badgeId: { userId: studentUsers[0].id, badgeId: badges[7].id } }, update: {}, create: { userId: studentUsers[0].id, badgeId: badges[7].id } }),
    ]);
  }

  // ── Challenge Progress ─────────────────────────────────────────────────────
  const challenges = await prisma.challenge.findMany();
  for (const ch of challenges) {
    await prisma.challengeProgress.upsert({
      where: { userId_challengeId: { userId: studentUsers[0].id, challengeId: ch.id } },
      update: {},
      create: { userId: studentUsers[0].id, challengeId: ch.id, progress: ch.id === "ch-daily-1" ? 3 : 0 },
    });
  }

  // ── Saved Events ───────────────────────────────────────────────────────────
  await Promise.all([
    prisma.savedEvent.upsert({ where: { userId_eventId: { userId: studentUsers[0].id, eventId: events[0].id } }, update: {}, create: { userId: studentUsers[0].id, eventId: events[0].id } }),
    prisma.savedEvent.upsert({ where: { userId_eventId: { userId: studentUsers[0].id, eventId: events[2].id } }, update: {}, create: { userId: studentUsers[0].id, eventId: events[2].id } }),
    prisma.savedEvent.upsert({ where: { userId_eventId: { userId: studentUsers[0].id, eventId: events[3].id } }, update: {}, create: { userId: studentUsers[0].id, eventId: events[3].id } }),
  ]);

  // ── Recommendations ────────────────────────────────────────────────────────
  const profiles = await prisma.studentProfile.findMany();
  const profile0 = profiles.find((p) => p.userId === studentUsers[0].id)!;
  await Promise.all(
    events.slice(0, 10).map((e, i) =>
      prisma.recommendation.upsert({
        where: { userId_eventId: { userId: studentUsers[0].id, eventId: e.id } },
        update: {},
        create: {
          userId: studentUsers[0].id,
          eventId: e.id,
          profileId: profile0.id,
          score: Math.max(40, Math.min(98, 95 - i * 7)),
          reasons: json([
            "Matches your AI/ML interest",
            i < 3 ? "Uses Python, one of your listed skills" : "Eligible for CSE students",
            i < 5 ? "Near your preferred location" : "Similar to events you saved",
          ]),
        },
      })
    )
  );

  // ── Notifications ──────────────────────────────────────────────────────────
  await Promise.all([
    prisma.notification.create({ data: { userId: studentUsers[0].id, type: NotificationType.DEADLINE_APPROACHING, title: "Deadline tomorrow", body: "HackAI Chennai 2026 registration closes in 7 days.", priority: Priority.URGENT } }),
    prisma.notification.create({ data: { userId: studentUsers[0].id, type: NotificationType.NEW_RECOMMENDATION, title: "New recommendation", body: "We found 3 new AI/ML hackathons matching your profile.", priority: Priority.IMPORTANT } }),
    prisma.notification.create({ data: { userId: studentUsers[0].id, type: NotificationType.BADGE_EARNED, title: "Badge earned", body: "You earned the Early Explorer badge!", priority: Priority.NORMAL } }),
    prisma.notification.create({ data: { userId: studentUsers[0].id, type: NotificationType.CHALLENGE_REMINDER, title: "Daily challenge", body: "You have 2 events left to view to complete today's challenge.", priority: Priority.NORMAL } }),
  ]);

  // ── Admin User ─────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@demo.ace" },
    update: {},
    create: { email: "admin@demo.ace", name: "ACE Admin", password: adminPassword, role: Role.ADMIN },
  });

  console.log("✅ Seed complete!");
  console.log("\n📋 Demo accounts:");
  console.log("  Student:   student@demo.ace  / demo1234");
  console.log("  Organizer: organizer@demo.ace / demo1234");
  console.log("  Admin:     admin@demo.ace     / admin1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
