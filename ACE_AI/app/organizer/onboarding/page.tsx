// app/organizer/onboarding/page.tsx — Organizer Profile Setup
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Briefcase, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OrganizerOnboarding() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    website: "",
    description: "",
  });

  useEffect(() => {
    if (session?.user?.name && !form.name) {
      setForm(prev => ({ ...prev, name: session.user.name! }));
    }
  }, [session]);

  async function handleComplete() {
    setLoading(true);
    try {
      // Create an API route for this if it doesn't exist, or just use a generic update
      await fetch("/api/profile/organizer/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      router.push("/organizer");
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function canProceed() {
    return form.name.trim() !== "" && form.description.trim() !== "";
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-surface rounded-3xl border border-border shadow-card p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1.5">Set up your Organization</h1>
          <p className="text-text-secondary text-sm">Tell students about your organization.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label">Organization Name <span className="text-danger">*</span></label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Google Developer Student Clubs" />
          </div>
          
          <div>
            <label className="form-label">Website</label>
            <Input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
          </div>

          <div>
            <label className="form-label">Description <span className="text-danger">*</span></label>
            <textarea 
              required 
              className="form-input min-h-[120px] py-3" 
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })} 
              placeholder="Tell us about what your organization does..." 
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex justify-end">
          <Button onClick={handleComplete} disabled={loading || !canProceed()}>
            {loading ? "Saving..." : "Complete Setup"} {!loading && <Zap className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
