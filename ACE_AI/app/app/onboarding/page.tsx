// app/app/onboarding/page.tsx — Multi-step student onboarding
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Zap, CheckCircle, ChevronRight, ChevronLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const SUGGESTED_SKILLS = ["Python", "Java", "C++", "JavaScript", "React", "AI/ML", "Data Science"];
const SUGGESTED_INTERESTS = ["Hackathons", "Internships", "Workshops", "Competitions"];
const SUGGESTED_GOALS = ["Software Engineering", "Product Management", "Design", "Research"];
const DEPARTMENTS = ["Computer Science & Engineering", "Information Technology", "Electronics & Communication", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "MBA", "Other"];

interface FormData {
  name: string;
  college: string;
  department: string;
  graduationYear: number;
  city: string;
  state: string;
  skills: string[];
  interests: string[];
  careerGoals: string[];
  locationPref: string[];
  notifFrequency: string;
}

const STEPS = ["Identity", "Skills", "Interests", "Career Goals", "Preferences"];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Custom input states
  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [goalInput, setGoalInput] = useState("");

  const [form, setForm] = useState<FormData>({
    name: "",
    college: "",
    department: "",
    graduationYear: 2026,
    city: "",
    state: "",
    skills: [],
    interests: [],
    careerGoals: [],
    locationPref: [],
    notifFrequency: "DAILY",
  });

  // Hydrate name from session once
  useEffect(() => {
    if (session?.user?.name && !form.name) {
      setForm(prev => ({ ...prev, name: session.user.name! }));
    }
  }, [session]);

  function toggle<K extends "skills" | "interests" | "careerGoals" | "locationPref">(key: K, value: string) {
    if (!value.trim()) return;
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value.trim()],
    }));
  }

  function handleCustomAdd(key: "skills" | "interests" | "careerGoals", value: string, setter: (val: string) => void) {
    if (value.trim() && !form[key].includes(value.trim())) {
      toggle(key, value.trim());
      setter("");
    }
  }

  function canProceed() {
    if (step === 0) {
      return form.name.trim() !== "" && form.college.trim() !== "" && form.department !== "";
    }
    return true;
  }

  async function handleComplete() {
    setLoading(true);
    try {
      await fetch("/api/profile/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      router.push("/app");
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-text-primary">ACE AI</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1.5">Set up your profile</h1>
          <p className="text-text-secondary text-sm">This helps us personalize your opportunity feed — takes 2 minutes.</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <span key={i} className={cn("text-xs font-medium", i <= step ? "text-primary-600" : "text-text-muted")}>{s}</span>
            ))}
          </div>
          <Progress value={progress} />
          <p className="text-xs text-text-muted mt-1.5">Step {step + 1} of {STEPS.length}</p>
        </div>

        {/* Step content */}
        <div className="bg-surface rounded-3xl border border-border shadow-card p-8">
          {/* Step 0 — Identity */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-text-primary mb-4">Tell us about yourself</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Full name <span className="text-danger">*</span></label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Arjun Sharma" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">College / University <span className="text-danger">*</span></label>
                  <Input required value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="Anna University, Chennai" />
                </div>
                <div>
                  <label className="form-label">Department <span className="text-danger">*</span></label>
                  <select required className="form-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Graduation Year</label>
                  <select className="form-input" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: parseInt(e.target.value) })}>
                    {[2025, 2026, 2027, 2028, 2029].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">City</label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Chennai" />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Tamil Nadu" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Skills */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold text-text-primary mb-2">What are your skills?</h2>
              <p className="text-sm text-text-muted mb-4">Add your skills to improve match scores.</p>
              
              <div className="flex gap-2 mb-4">
                <Input 
                  value={skillInput} 
                  onChange={e => setSkillInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCustomAdd("skills", skillInput, setSkillInput))}
                  placeholder="Type a skill and press Enter..." 
                />
                <Button variant="secondary" onClick={() => handleCustomAdd("skills", skillInput, setSkillInput)}><Plus className="w-4 h-4" /></Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {form.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1.5 rounded-xl text-sm font-medium bg-primary-100 text-primary-700 flex items-center gap-1.5 border border-primary-200">
                    {skill}
                    <button onClick={() => toggle("skills", skill)} className="hover:text-primary-900"><X className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
              </div>

              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SKILLS.filter(s => !form.skills.includes(s)).map((skill) => (
                  <button key={skill} onClick={() => toggle("skills", skill)} className="px-3 py-1.5 rounded-xl text-sm font-medium border border-border bg-surface text-text-secondary hover:border-primary-200">
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Interests */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold text-text-primary mb-2">What opportunities interest you?</h2>
              
              <div className="flex gap-2 mb-4">
                <Input 
                  value={interestInput} 
                  onChange={e => setInterestInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCustomAdd("interests", interestInput, setInterestInput))}
                  placeholder="Type an interest..." 
                />
                <Button variant="secondary" onClick={() => handleCustomAdd("interests", interestInput, setInterestInput)}><Plus className="w-4 h-4" /></Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {form.interests.map((interest) => (
                  <span key={interest} className="px-3 py-1.5 rounded-xl text-sm font-medium bg-primary-100 text-primary-700 flex items-center gap-1.5 border border-primary-200">
                    {interest}
                    <button onClick={() => toggle("interests", interest)} className="hover:text-primary-900"><X className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
              </div>

              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_INTERESTS.filter(s => !form.interests.includes(s)).map((interest) => (
                  <button key={interest} onClick={() => toggle("interests", interest)} className="px-3 py-1.5 rounded-xl text-sm font-medium border border-border bg-surface text-text-secondary hover:border-primary-200">
                    + {interest}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Career Goals */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold text-text-primary mb-2">What are your career goals?</h2>
              
              <div className="flex gap-2 mb-4">
                <Input 
                  value={goalInput} 
                  onChange={e => setGoalInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCustomAdd("careerGoals", goalInput, setGoalInput))}
                  placeholder="Type a career goal..." 
                />
                <Button variant="secondary" onClick={() => handleCustomAdd("careerGoals", goalInput, setGoalInput)}><Plus className="w-4 h-4" /></Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {form.careerGoals.map((goal) => (
                  <span key={goal} className="px-3 py-1.5 rounded-xl text-sm font-medium bg-primary-100 text-primary-700 flex items-center gap-1.5 border border-primary-200">
                    {goal}
                    <button onClick={() => toggle("careerGoals", goal)} className="hover:text-primary-900"><X className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
              </div>

              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_GOALS.filter(s => !form.careerGoals.includes(s)).map((goal) => (
                  <button key={goal} onClick={() => toggle("careerGoals", goal)} className="px-3 py-1.5 rounded-xl text-sm font-medium border border-border bg-surface text-text-secondary hover:border-primary-200">
                    + {goal}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Preferences */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-text-primary">Location & notification preferences</h2>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-3">Location preference</p>
                <div className="flex flex-wrap gap-2">
                  {["Remote", "My City", "My State", "Pan India"].map((loc) => {
                    const val = loc.toLowerCase().replace(" ", "-");
                    return (
                      <button
                        key={loc}
                        onClick={() => toggle("locationPref", val)}
                        className={cn("px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all", form.locationPref.includes(val) ? "border-primary-500 bg-primary-100 text-primary-700" : "border-border bg-surface text-text-secondary hover:border-primary-200")}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-3">Notification frequency</p>
                <div className="flex gap-3">
                  {["DAILY", "WEEKLY", "IMPORTANT_ONLY"].map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setForm({ ...form, notifFrequency: freq })}
                      className={cn("px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all", form.notifFrequency === freq ? "border-primary-500 bg-primary-100 text-primary-700" : "border-border bg-surface text-text-secondary hover:border-primary-200")}
                    >
                      {freq.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading || !canProceed()}>
                {loading ? "Saving..." : "Get Started"} {!loading && <Zap className="w-4 h-4 mr-0 ml-1.5" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
