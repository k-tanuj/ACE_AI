# ACE AI — AI-Powered Student Opportunity Ecosystem

**AllCollegeEvent.com AI Enhancement Layer**  
Conforming to **Software Requirements Document (SRD) v1.0**

---

## 🌟 Overview

ACE AI is an AI enhancement layer designed to transform AllCollegeEvent.com into a personalized, scalable opportunity ecosystem for over 1 million students. It integrates 6 core AI modules:

1. **AI Event Recommendation Engine**: Weighted semantic scoring model based on student profiles, embeddings, diversity filtering, and cold-start fallback.
2. **AI Smart Search & Discovery Assistant**: Natural language intent parser, hybrid search, spelling correction, synonym expansion, and query logging (runs only after authenticated login).
3. **AI Student Assistance Chatbot**: Conversational assistant grounded in platform event data and FAQs, with session context persistence and human escalation.
4. **AI-Based App Engagement Enhancement**: Personalized student feed, gamification (XP, streaks, badges, leaderboards), and smart notifications for deadlines & re-engagement.
5. **AI Event Verification & Quality Scanner**: Quality scoring (0–100), duplicate detection (>85% text similarity), spam keyword identification, and automated moderation verdicts.
6. **AI Content Generation Assistant**: Multi-tone event descriptions (formal, casual, energetic) and multi-channel promotional marketing content for organizers.

---

## 🏗 Architecture & Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS & Radix UI
- **Database & ORM**: SQLite / PostgreSQL via Prisma ORM
- **Authentication**: NextAuth.js v5 (JWT Strategy)
- **AI/ML Layer**: Vercel AI SDK with Google Gemini 1.5 Flash + high-fidelity fallback mocks

---

## 🚀 Quick Setup & Running Locally

### 1. Prerequisites
- Node.js (v20+ LTS recommended)
- Git

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp ACE_AI/.env.example ACE_AI/.env
```

### 3. Installation & Database Setup
```powershell
cd ACE_AI
npm install
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Start Development Server
```powershell
npm run dev
# or run the root script: .\run.bat
```
Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Accounts (Pre-Seeded)

| Role | Email | Password | Features Accessible |
| :--- | :--- | :--- | :--- |
| **Student** | `student@demo.ace` | `demo1234` | Smart Search, Personalized Feed, Gamification, ACE Chatbot |
| **Organizer** | `organizer@demo.ace` | `demo1234` | Event Creation, AI Content Generation, Promotion Copy |
| **Admin** | `admin@demo.ace` | `admin1234` | AI Quality Scanner, Duplicate Detector, Notifications Dispatch |

---

## 📡 API Endpoints (SRD §7 Specifications)

| Endpoint | Method | Description | Module |
| :--- | :--- | :--- | :--- |
| `/api/recommendations` | `GET` | Get top-10 personalized recommendations with diversity filter | Module 1 |
| `/api/recommendations/{user_id}` | `GET` | Get recommendations for specific student | Module 1 |
| `/api/recommendations` | `POST` | Record user feedback (thumbs up / thumbs down) | Module 1 |
| `/api/search` | `POST` | Natural language smart search (**requires login**) | Module 2 |
| `/api/chat` | `POST` | Multi-turn RAG chatbot with database grounding | Module 3 |
| `/api/engagement/feed/{user_id}` | `GET` | Personalized student feed & gamification stats | Module 4 |
| `/api/engagement/notify` | `POST` | Trigger smart deadline & re-engagement notifications | Module 4 |
| `/api/verify/event/{event_id}` | `GET` | Quality scan & duplicate check for single event | Module 5 |
| `/api/verify/scan` | `POST` | Platform-wide verification scan for admins | Module 5 |
| `/api/generate/description` | `POST` | Generate event descriptions with tone selection | Module 6 |
| `/api/generate/promo` | `POST` | Generate LinkedIn, Twitter/X, and Email promo copy | Module 6 |

---

## 🧪 Testing the Modules

All automated verification checks can be validated via the live endpoints:
- **Smart Search Authentication**: Try searching unauthenticated vs authenticated.
- **AI Assist in Event Creation**: Go to `/organizer/events/new`, enter a title, choose a tone, and click **AI Assist**.
- **Admin Quality Scanner**: Log in as `admin@demo.ace` at `/admin` and click **Run AI Quality Scanner**.
