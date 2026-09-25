// app/(auth)/signup/page.tsx — Registration page
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { ArrowRight, GraduationCap, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"STUDENT" | "ORGANIZER">("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }

      // Auto sign in
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) { router.push("/login"); return; }

      if (role === "STUDENT") router.push("/app/onboarding");
      else router.push("/organizer");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[480px] bg-gradient-hero flex-col justify-center items-center text-white px-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 70% 70%, rgba(255,255,255,0.3), transparent 50%)" }} />
        <div className="relative text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/20 p-2">
            <Image src="/ace-ai-logo.png" alt="ACE AI" width={64} height={64} className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Start your opportunity journey</h2>
          <p className="text-primary-200 leading-relaxed text-sm">Join thousands of students discovering AI-matched hackathons, internships, and workshops on ACE AI.</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12 bg-background">
        <div className="max-w-sm mx-auto w-full">
          <Link href="/" className="flex items-center mb-10">
            <Image
              src="/ace-ai-logo.png"
              alt="ACE AI"
              width={110}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>

          <h1 className="text-2xl font-bold text-text-primary mb-1.5">Create your account</h1>
          <p className="text-text-secondary mb-8 text-sm">Get started with ACE AI for free</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              id="role-student"
              onClick={() => setRole("STUDENT")}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 ${role === "STUDENT" ? "border-primary-500 bg-primary-100/60 text-primary-700" : "border-border bg-surface text-text-secondary hover:border-primary-200"}`}
            >
              <GraduationCap className="w-5 h-5" />
              <span className="text-sm font-semibold">Student</span>
              <span className="text-[10px] text-center leading-tight opacity-70">Discover & track opportunities</span>
            </button>
            <button
              type="button"
              id="role-organizer"
              onClick={() => setRole("ORGANIZER")}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 ${role === "ORGANIZER" ? "border-primary-500 bg-primary-100/60 text-primary-700" : "border-border bg-surface text-text-secondary hover:border-primary-200"}`}
            >
              <Briefcase className="w-5 h-5" />
              <span className="text-sm font-semibold">Organizer</span>
              <span className="text-[10px] text-center leading-tight opacity-70">Post & manage events</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" id="signup-form">
            <div>
              <label htmlFor="name" className="form-label">Full name</label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Arjun Sharma" required autoComplete="name" />
            </div>
            <div>
              <label htmlFor="signup-email" className="form-label">Email address</label>
              <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" required autoComplete="email" />
            </div>
            <div>
              <label htmlFor="signup-password" className="form-label">Password</label>
              <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" minLength={6} required autoComplete="new-password" />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? "Creating account..." : "Create Account"} {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
