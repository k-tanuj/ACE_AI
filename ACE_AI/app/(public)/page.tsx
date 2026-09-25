// app/(public)/page.tsx — ACE AI Landing Page
import Link from "next/link";
import { ArrowRight, Search, Zap, ShieldCheck, MessageCircle, Trophy, Star, CheckCircle, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-text-primary">ACE AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link href="/events" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-muted rounded-xl transition-all">Opportunities</Link>
            <Link href="/search" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-muted rounded-xl transition-all">Smart Search</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/5 via-primary-500/5 to-transparent" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/8 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-sm font-medium px-3.5 py-1.5 rounded-full mb-6">
              <Zap className="w-3.5 h-3.5" />
              AI-Powered Opportunity Discovery
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-6xl font-bold text-text-primary leading-[1.1] tracking-tight mb-5">
              Discover better{" "}
              <span className="gradient-text">opportunities.</span>
              <br />
              Powered by AI.
            </h1>
            <p className="text-xl text-text-secondary leading-relaxed mb-8 max-w-xl">
              ACE AI learns your skills, interests, and career goals — then surfaces the hackathons, internships, and workshops that actually matter to you.
            </p>

            {/* Smart Search Input */}
            <div className="flex gap-3 mb-8 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input
                  className="w-full pl-12 pr-4 h-12 rounded-2xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-card transition-all"
                  placeholder='Try: "AI hackathons for CSE students in Chennai this month"'
                />
              </div>
              <Button size="lg" className="rounded-2xl px-6 shrink-0" asChild>
                <Link href="/search">Search <ArrowRight className="w-4 h-4" /></Link>
              </Button>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="rounded-2xl" asChild>
                <Link href="/events">Explore Opportunities <ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button variant="secondary" size="lg" className="rounded-2xl" asChild>
                <Link href="/signup">Meet ACE AI</Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 mt-10 text-sm text-text-muted">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary-500" /><strong className="text-text-primary">10,000+</strong> students</span>
              <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-warning" /><strong className="text-text-primary">500+</strong> verified events</span>
              <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-success" /><strong className="text-text-primary">94%</strong> match accuracy</span>
            </div>
          </div>

          {/* Hero visual — Dashboard preview */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden xl:block w-[480px] opacity-80">
            <div className="bg-surface rounded-3xl shadow-elevated border border-border p-5 transform rotate-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-primary-600" />
                </div>
                <span className="text-sm font-semibold text-text-primary">Recommended for Arjun</span>
              </div>
              {[
                { title: "HackAI Chennai 2026", type: "Hackathon", score: 95, color: "#7C5CFF" },
                { title: "NASSCOM AI Internship", type: "Internship", score: 89, color: "#20A46B" },
                { title: "Google DSC AI Bootcamp", type: "Workshop", score: 82, color: "#4E8FF7" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + "20" }}>
                    <Zap className="w-3.5 h-3.5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{item.title}</p>
                    <p className="text-[10px] text-text-muted">{item.type}</p>
                  </div>
                  <span className="text-xs font-bold text-primary-600 shrink-0">{item.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">Everything you need to get ahead</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">ACE AI combines personalization, trust, and engagement to help you find and apply to the best student opportunities.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-surface rounded-2xl p-6 border border-border/60 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${f.iconBg}`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Section ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-success/10 text-success text-sm font-medium px-3.5 py-1.5 rounded-full mb-6">
                <ShieldCheck className="w-3.5 h-3.5" />
                Trust & Verification
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-4">Know before you apply</h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">Every event on ACE AI is analyzed by our AI verification engine. See quality scores, organizer credibility, and risk flags — before you invest your time.</p>
              <div className="space-y-3">
                {["Event Quality Score based on completeness, dates, and registration validity", "Organizer Credibility Score from verified institutional presence", "Automatic duplicate and suspicious listing detection", "Risk flags with clear explanations — never vague warnings"].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-4.5 h-4.5 text-success mt-0.5 shrink-0" />
                    <span className="text-sm text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Trust card preview */}
            <div className="bg-surface-muted rounded-3xl p-6 border border-border">
              <p className="text-sm font-semibold text-text-secondary mb-4">Event Trust Panel</p>
              {[
                { label: "Event Quality Score", value: 92, color: "bg-success" },
                { label: "Organizer Credibility", value: 96, color: "bg-primary-500" },
                { label: "Description Quality", value: 88, color: "bg-info" },
                { label: "Duplicate Safety", value: 100, color: "bg-success" },
              ].map((item, i) => (
                <div key={i} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-secondary">{item.label}</span>
                    <span className="text-xs font-bold text-text-primary">{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
              <div className="mt-4 flex items-center gap-2 p-2.5 bg-success/10 rounded-xl">
                <CheckCircle className="w-4 h-4 text-success shrink-0" />
                <span className="text-xs font-medium text-success">Verified by ACE AI — No risk flags detected</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gamification Section ─────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Gamification preview */}
            <div className="bg-gradient-to-br from-primary-900 to-primary-700 rounded-3xl p-6 text-white">
              <p className="text-sm font-medium text-primary-300 mb-4">Your Progress</p>
              <div className="flex items-end gap-4 mb-6">
                <div>
                  <p className="text-4xl font-bold">340 XP</p>
                  <p className="text-sm text-primary-300 mt-1">Level 2 — Opportunity Seeker</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-primary-600 overflow-hidden mb-6">
                <div className="h-full w-[68%] rounded-full bg-white/80" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "5-day streak", icon: "flame" },
                  { label: "Early Explorer", icon: "compass" },
                  { label: "Onboarded", icon: "graduation-cap" },
                ].map((badge, i) => (
                  <div key={i} className="bg-primary-800/50 rounded-xl p-2.5 text-center">
                    <div className="w-8 h-8 rounded-lg bg-primary-700 mx-auto mb-1.5 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-primary-300" />
                    </div>
                    <p className="text-[10px] text-primary-300 leading-tight">{badge.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-warning/10 text-warning text-sm font-medium px-3.5 py-1.5 rounded-full mb-6">
                <Trophy className="w-3.5 h-3.5" />
                Engagement & Rewards
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-4">Stay motivated, earn rewards</h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">ACE AI turns your exploration into progress. Earn XP for every meaningful action, maintain streaks, unlock badges, and compete on the leaderboard.</p>
              <div className="space-y-3">
                {["Earn XP for saving events, applying, and using ACE Chat", "Daily and weekly challenges that push you to explore more", "Badges for milestones: First Application, 7-Day Streak, AI Explorer", "Leaderboard to see how you rank among peers"].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-4.5 h-4.5 text-warning mt-0.5 shrink-0" />
                    <span className="text-sm text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-hero rounded-3xl px-12 py-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white, transparent 50%), radial-gradient(circle at 70% 50%, white, transparent 50%)" }} />
          <div className="relative">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to discover your next opportunity?</h2>
            <p className="text-lg text-primary-200 mb-8 max-w-xl mx-auto">Join thousands of students who use ACE AI to find hackathons, internships, and workshops tailored to their profile.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" className="bg-white text-primary-700 hover:bg-primary-100 rounded-2xl" asChild>
                <Link href="/signup">Create Free Account <ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 rounded-2xl border border-white/20" asChild>
                <Link href="/events">Browse Opportunities</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-text-primary">ACE AI</span>
            <span className="text-sm text-text-muted ml-2">by Team ALGORHYTHM</span>
          </div>
          <p className="text-sm text-text-muted">Built for HackNIMA 2026 — AI Enhancement Solutions track</p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Star, iconBg: "bg-primary-100", iconColor: "text-primary-600", title: "AI Recommendations", description: "Get opportunities ranked by a weighted model using your skills, interests, career goals, location, and activity." },
  { icon: Search, iconBg: "bg-info/10", iconColor: "text-info", title: "Smart Natural Search", description: "Ask in plain English. 'Find AI hackathons for CSE students in Chennai this month' — ACE AI understands." },
  { icon: MessageCircle, iconBg: "bg-primary-100", iconColor: "text-primary-600", title: "ACE Chat Assistant", description: "Your AI assistant for finding events, comparing opportunities, explaining eligibility, and guiding registration." },
  { icon: ShieldCheck, iconBg: "bg-success/10", iconColor: "text-success", title: "Event Trust Scores", description: "Every listing is scored for quality and organizer credibility. Know before you apply." },
  { icon: Trophy, iconBg: "bg-warning/10", iconColor: "text-warning", title: "Gamification", description: "Earn XP, unlock badges, maintain streaks, and complete challenges as you explore opportunities." },
  { icon: TrendingUp, iconBg: "bg-danger/10", iconColor: "text-danger", title: "Progress Tracking", description: "See your journey — saved events, applications, XP, level, and personalized insights." },
];
