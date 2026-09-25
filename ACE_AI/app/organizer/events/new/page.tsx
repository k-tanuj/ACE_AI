// app/organizer/events/new/page.tsx — Create event form
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_TYPE_LABELS } from "@/lib/utils";
import { Save, Loader2, Sparkles } from "lucide-react";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
        eligibility: JSON.stringify(form.eligibility.split(",").map(s => s.trim()).filter(Boolean)),
        skills: JSON.stringify(form.skills.split(",").map(s => s.trim()).filter(Boolean)),
      };

      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create");
      router.push("/organizer");
    } catch (err) {
      alert("Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Create New Event</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-surface p-6 rounded-3xl border border-border">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Basic Information</h2>
          <div>
            <label className="form-label">Event Title</label>
            <Input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. HackAI Chennai 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label flex items-center justify-between">Location <span className="flex items-center gap-2 text-xs font-normal"><input type="checkbox" checked={form.isRemote} onChange={e => setForm({...form, isRemote: e.target.checked})} /> Remote</span></label>
              <Input required={!form.isRemote} disabled={form.isRemote} value={form.isRemote ? "Remote" : form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. IIT Madras Campus" />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Dates & Links</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Start Date</label>
              <Input required type="datetime-local" value={form.startAt} onChange={e => setForm({...form, startAt: e.target.value})} />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <Input type="datetime-local" value={form.endAt} onChange={e => setForm({...form, endAt: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Registration Deadline</label>
              <Input required type="datetime-local" value={form.registrationDeadline} onChange={e => setForm({...form, registrationDeadline: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="form-label">Registration URL</label>
            <Input type="url" value={form.registrationUrl} onChange={e => setForm({...form, registrationUrl: e.target.value})} placeholder="https://..." />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-lg font-semibold">Content & Requirements</h2>
            <Button type="button" variant="ghost" size="sm" className="text-primary-600"><Sparkles className="w-4 h-4 mr-1" /> AI Assist</Button>
          </div>
          <div>
            <label className="form-label">Short Summary (1-2 sentences)</label>
            <Input required value={form.shortSummary} onChange={e => setForm({...form, shortSummary: e.target.value})} placeholder="Brief overview for event cards" />
          </div>
          <div>
            <label className="form-label">Full Description</label>
            <textarea required className="form-input min-h-[120px] py-3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detailed information about the event..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Eligibility (comma separated)</label>
              <Input value={form.eligibility} onChange={e => setForm({...form, eligibility: e.target.value})} placeholder="e.g. 3rd Year, CSE, B.Tech" />
            </div>
            <div>
              <label className="form-label">Skills (comma separated)</label>
              <Input value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} placeholder="e.g. Python, React, AI" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Submit for Review
          </Button>
        </div>
      </form>
    </div>
  );
}
