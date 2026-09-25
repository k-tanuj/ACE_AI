// app/(auth)/login/page.tsx — Dual-panel Login (Student / Organizer)
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Zap, Eye, EyeOff, ArrowRight, Lock, Mail, GraduationCap, Briefcase, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/app";

  const [activePortal, setActivePortal] = useState<"STUDENT" | "ORGANIZER">("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Invalid email or password. Check demo accounts below.");
      } else {
        router.push(from);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(type: "student" | "organizer" | "admin") {
    const accounts = {
      student: { email: "student@demo.ace", password: "demo1234", portal: "STUDENT" as const },
      organizer: { email: "organizer@demo.ace", password: "demo1234", portal: "ORGANIZER" as const },
      admin: { email: "admin@demo.ace", password: "admin1234", portal: "ORGANIZER" as const }, // Admin can use either, we'll set it here
    };
    setEmail(accounts[type].email);
    setPassword(accounts[type].password);
    setActivePortal(accounts[type].portal);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-6">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-2xl text-text-primary">ACE AI</span>
        </Link>
        <Link href="/signup" className="text-sm font-medium text-primary-600 hover:underline">
          Don&apos;t have an account? Sign up
        </Link>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-text-primary mb-3">Welcome to ACE AI</h1>
        <p className="text-text-secondary">Select your portal to continue</p>
      </div>

      {/* Portal Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-8">
        {/* Student Card */}
        <button
          onClick={() => { setActivePortal("STUDENT"); setError(""); }}
          className={cn(
            "flex flex-col items-center text-center p-8 rounded-3xl border-2 transition-all duration-200",
            activePortal === "STUDENT" 
              ? "border-primary-500 bg-primary-50/50 shadow-card" 
              : "border-border bg-surface hover:border-primary-200 hover:shadow-sm"
          )}
        >
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
            activePortal === "STUDENT" ? "bg-primary-500 text-white" : "bg-primary-100 text-primary-600"
          )}>
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Student Portal</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Discover hackathons, internships, and workshops tailored to your skills.
          </p>
        </button>

        {/* Organizer Card */}
        <button
          onClick={() => { setActivePortal("ORGANIZER"); setError(""); }}
          className={cn(
            "flex flex-col items-center text-center p-8 rounded-3xl border-2 transition-all duration-200",
            activePortal === "ORGANIZER" 
              ? "border-primary-500 bg-primary-50/50 shadow-card" 
              : "border-border bg-surface hover:border-primary-200 hover:shadow-sm"
          )}
        >
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
            activePortal === "ORGANIZER" ? "bg-primary-500 text-white" : "bg-primary-100 text-primary-600"
          )}>
            <Briefcase className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Organizer Portal</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Post opportunities, manage applications, and reach verified students.
          </p>
        </button>
      </div>

      {/* Login Form Section */}
      <div className="w-full max-w-md bg-surface p-8 rounded-3xl border border-border shadow-card animate-fade-in">
        <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
          {activePortal === "STUDENT" ? <GraduationCap className="w-5 h-5 text-primary-600" /> : <Briefcase className="w-5 h-5 text-primary-600" />}
          {activePortal === "STUDENT" ? "Student Sign In" : "Organizer Sign In"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="form-label">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" className="pl-10" required autoComplete="email" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="form-label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10"
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors" aria-label={showPwd ? "Hide password" : "Show password"}>
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading} size="lg">
            {loading ? "Signing in..." : "Sign in"} {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>

        {/* Demo accounts */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs font-medium text-text-muted mb-3 uppercase tracking-wide text-center">One-Click Demo Login</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => fillDemo("student")} className="text-xs px-2 py-2 bg-primary-50 text-primary-700 border border-primary-100 rounded-xl font-medium hover:bg-primary-100 transition-colors flex flex-col items-center gap-1">
              <GraduationCap className="w-4 h-4" /> Student
            </button>
            <button onClick={() => fillDemo("organizer")} className="text-xs px-2 py-2 bg-primary-50 text-primary-700 border border-primary-100 rounded-xl font-medium hover:bg-primary-100 transition-colors flex flex-col items-center gap-1">
              <Briefcase className="w-4 h-4" /> Organizer
            </button>
            <button onClick={() => fillDemo("admin")} className="text-xs px-2 py-2 bg-primary-50 text-primary-700 border border-primary-100 rounded-xl font-medium hover:bg-primary-100 transition-colors flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
