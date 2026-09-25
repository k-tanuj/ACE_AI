// app/organizer/events/new/page.tsx — Create event form with AI Content Generation Assistant
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_TYPE_LABELS } from "@/lib/utils";
import { Save, Loader2, Sparkles, Copy, Check, Share2, Wand2 } from "lucide-react";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [tone, setTone] = useState<"formal" | "casual" | "energetic">("formal");
  const [promoData, setPromoData] = useState<{
    linkedinPost?: string;
    twitterPost?: string;
    emailBody?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    type: "HACKATHON",
    shortSummary: "",
    description: "",
    location: "",
    isRemote: false,
    startAt: "",
    endAt: "",
    registrationDeadline: "",
    registrationUrl: "",
    eligibility: "",
    skills: "",
  });

  async function handleAiAssist() {
    if (!form.title.trim()) {
      alert("Please enter an Event Title first so AI can generate relevant content.");
      return;
    }

    setAiLoading(true);
    try {
      // 1. Generate Description & Highlights
      const descRes = await fetch("/api/generate/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          location: form.location,
          isRemote: form.isRemote,
          skills: form.skills,
          tone,
        }),
      });
      const descData = await descRes.json();

      // 2. Generate Promotional Copies
      const promoRes = await fetch("/api/generate/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          location: form.location,
          isRemote: form.isRemote,
          skills: form.skills,
          tone,
        }),
      });
      const promoJson = await promoRes.json();

      if (descData.success) {
        setForm((prev) => ({
          ...prev,
          description: descData.description || prev.description,
          shortSummary: descData.shortSummary || prev.shortSummary,
          skills: prev.skills || (descData.recommendedSkills?.join(", ") ?? ""),
          eligibility: prev.eligibility || descData.eligibilityNotes || prev.eligibility,
        }));
      }

      if (promoJson.success) {
        setPromoData({
          linkedinPost: promoJson.linkedinPost,
          twitterPost: promoJson.twitterPost,
          emailBody: promoJson.emailBody,
        });
      }
    } catch (err) {
      console.error(err);
      alert("AI content generation encountered an error.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        isRemote: form.isRemote,
        startAt: new Date(form.startAt).toISOString(),
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        eligibility: JSON.stringify(
          form.eligibility.split(",").map((s) => s.trim()).filter(Boolean)
        ),
        skills: JSON.stringify(
          form.skills.split(",").map((s) => s.trim()).filter(Boolean)
        ),
      };

      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to create event");
      }

      router.push("/organizer/events");
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Create New Event</h1>
          <p className="text-sm text-text-muted">Fill in the details or use AI Assist to write descriptions and marketing copy.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface p-7 rounded-3xl border border-border shadow-card">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Basic Information</h2>
          <div>
            <label className="form-label">Event Title *</label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. HackAI Chennai 2026"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Category</label>
              <select
                className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label flex items-center justify-between">
                Location{" "}
                <span className="flex items-center gap-1.5 text-xs font-normal">
                  <input
                    type="checkbox"
                    checked={form.isRemote}
                    onChange={(e) => setForm({ ...form, isRemote: e.target.checked })}
                    id="remote-check"
                  />
                  <label htmlFor="remote-check" className="cursor-pointer">Remote / Online</label>
                </span>
              </label>
              <Input
                required={!form.isRemote}
                disabled={form.isRemote}
                value={form.isRemote ? "Remote / Online" : form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. IIT Madras Campus, Chennai"
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Dates & Registration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Start Date *</label>
              <Input
                required
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <Input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Registration Deadline *</label>
              <Input
                required
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Registration Link (HTTPS)</label>
            <Input
              type="url"
              value={form.registrationUrl}
              onChange={(e) => setForm({ ...form, registrationUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* AI Assisted Content */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-border pb-2 gap-2">
            <h2 className="text-lg font-semibold">Content & Requirements</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Tone:</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as "formal" | "casual" | "energetic")}
                className="text-xs h-8 px-2 rounded-lg border border-border bg-surface text-text-secondary"
              >
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
                <option value="energetic">Energetic</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiAssist}
                disabled={aiLoading}
                className="text-primary-700 bg-primary-50 border-primary-200 hover:bg-primary-100 rounded-xl"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1.5 text-primary-600" />
                )}
                AI Assist (Generate)
              </Button>
            </div>
          </div>

          <div>
            <label className="form-label">Short Summary (max 120 chars)</label>
            <Input
              required
              value={form.shortSummary}
              onChange={(e) => setForm({ ...form, shortSummary: e.target.value })}
              placeholder="Brief overview for event discovery cards"
            />
          </div>

          <div>
            <label className="form-label">Full Description *</label>
            <textarea
              required
              rows={6}
              className="w-full p-3 rounded-2xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed agenda, tracks, evaluation criteria, and prizes..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Eligibility (comma separated)</label>
              <Input
                value={form.eligibility}
                onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
                placeholder="e.g. 2nd-4th year, CSE, IT"
              />
            </div>
            <div>
              <label className="form-label">Required Skills (comma separated)</label>
              <Input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="e.g. Python, Machine Learning, TensorFlow"
              />
            </div>
          </div>
        </div>

        {/* AI Generated Promotional Copy Preview (FR-6.2 & FR-6.3) */}
        {promoData && (
          <div className="p-5 rounded-2xl bg-primary-50/70 border border-primary-200 space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary-700" />
              <h3 className="text-sm font-bold text-primary-900">AI Generated Promotional Marketing Content</h3>
            </div>
            <p className="text-xs text-primary-700">Ready to copy and share across your communication channels:</p>

            <div className="space-y-3">
              {promoData.linkedinPost && (
                <div className="p-3 bg-surface rounded-xl border border-border text-xs">
                  <div className="flex justify-between items-center mb-1 font-semibold text-text-primary">
                    <span>LinkedIn / Professional Post</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(promoData.linkedinPost!, "linkedin")}
                      className="text-primary-600 flex items-center gap-1 hover:underline"
                    >
                      {copiedKey === "linkedin" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === "linkedin" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-text-secondary">{promoData.linkedinPost}</p>
                </div>
              )}

              {promoData.twitterPost && (
                <div className="p-3 bg-surface rounded-xl border border-border text-xs">
                  <div className="flex justify-between items-center mb-1 font-semibold text-text-primary">
                    <span>Twitter / X (under 280 chars)</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(promoData.twitterPost!, "twitter")}
                      className="text-primary-600 flex items-center gap-1 hover:underline"
                    >
                      {copiedKey === "twitter" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === "twitter" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-text-secondary">{promoData.twitterPost}</p>
                </div>
              )}

              {promoData.emailBody && (
                <div className="p-3 bg-surface rounded-xl border border-border text-xs">
                  <div className="flex justify-between items-center mb-1 font-semibold text-text-primary">
                    <span>College Email Invitation</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(promoData.emailBody!, "email")}
                      className="text-primary-600 flex items-center gap-1 hover:underline"
                    >
                      {copiedKey === "email" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === "email" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-text-secondary">{promoData.emailBody}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading} size="lg" className="rounded-xl px-8">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Submit for Review
          </Button>
        </div>
      </form>
    </div>
  );
}
