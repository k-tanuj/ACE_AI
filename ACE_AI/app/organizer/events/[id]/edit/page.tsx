// app/organizer/events/[id]/edit/page.tsx — Edit event form
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_TYPE_LABELS } from "@/lib/utils";
import { Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
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

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/events/${params.id}`);
        if (!res.ok) throw new Error("Failed to load event");
        const data = await res.json();
        
        // Format dates for datetime-local inputs
        const formatDt = (dtStr: string) => dtStr ? new Date(dtStr).toISOString().slice(0, 16) : "";

        setForm({
          title: data.title || "",
          type: data.type || "HACKATHON",
          shortSummary: data.shortSummary || "",
          description: data.description || "",
          location: data.location || "",
          isRemote: data.isRemote || false,
          startAt: formatDt(data.startAt),
          endAt: formatDt(data.endAt),
          registrationDeadline: formatDt(data.registrationDeadline),
          registrationUrl: data.registrationUrl || "",
          eligibility: Array.isArray(data.eligibility) ? data.eligibility.join(", ") : (typeof data.eligibility === 'string' ? JSON.parse(data.eligibility || "[]").join(", ") : ""),
          skills: Array.isArray(data.skills) ? data.skills.join(", ") : (typeof data.skills === 'string' ? JSON.parse(data.skills || "[]").join(", ") : ""),
        });
      } catch (err) {
        console.error(err);
        alert("Could not load event data.");
      } finally {
        setFetching(false);
      }
    }
    loadEvent();
  }, [params.id]);

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

      const res = await fetch(`/api/events/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update event");
      }
      
      // Auto-trigger an AI scan for the updated event (since it's now PENDING)
      fetch("/api/verify/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: params.id })
      }).catch(console.error);

      router.push("/organizer/events");
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to update event");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Edit Event</h1>
          <p className="text-sm text-text-muted">Update event details. Saving will automatically resubmit this event for AI review.</p>
        </div>
        <Link href="/organizer/events">
           <Button variant="outline">Cancel</Button>
        </Link>
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

        {/* Content */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Content & Requirements</h2>

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

        <div className="flex justify-end pt-4 gap-2">
          <Link href="/organizer/events">
             <Button type="button" variant="outline" size="lg" className="rounded-xl">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} size="lg" className="rounded-xl px-8">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save & Resubmit to AI
          </Button>
        </div>
      </form>
    </div>
  );
}
