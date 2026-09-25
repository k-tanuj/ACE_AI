// app/organizer/content-assistant/page.tsx — AI Content Generation Assistant (SRD §3.6 FR-6.1 to FR-6.7)
"use client";

import { useState } from "react";
import { Wand2, Sparkles, Copy, Check, RefreshCw, FileText, Linkedin, Twitter, Mail, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ContentTone = "formal" | "casual" | "energetic";

interface GeneratedContent {
  description: string;
  linkedin: string;
  twitter: string;
  email: string;
}

const TONES: { value: ContentTone; label: string; desc: string }[] = [
  { value: "formal", label: "Formal", desc: "Professional & authoritative" },
  { value: "casual", label: "Casual", desc: "Friendly & approachable" },
  { value: "energetic", label: "Energetic", desc: "Bold & motivating" },
];

const CATEGORIES = ["Hackathon", "Internship", "Workshop", "Competition", "Conference", "Scholarship", "Certification", "Research"];

export default function ContentAssistantPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Hackathon");
  const [tone, setTone] = useState<ContentTone>("energetic");
  const [department, setDepartment] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);

  const isReady = title.trim().length >= 5;

  const handleGenerate = async () => {
    if (!isReady) return;
    setIsGenerating(true);
    setError(null);
    setGenerated(null);

    try {
      // First get description
      const descRes = await fetch("/api/generate/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, tone, department: department.trim() || undefined }),
      });

      // Then get promo copy
      const promoRes = await fetch("/api/generate/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, tone, department: department.trim() || undefined }),
      });

      const [descData, promoData] = await Promise.all([
        descRes.ok ? descRes.json() : null,
        promoRes.ok ? promoRes.json() : null,
      ]);

      if (!descData && !promoData) {
        throw new Error("Both generation APIs failed");
      }

      setGenerated({
        description: descData?.description ?? `[AI unavailable — set GOOGLE_GENERATIVE_AI_API_KEY to enable real generation]\n\n${title} is an exciting ${category.toLowerCase()} opportunity for students.`,
        linkedin: promoData?.promoCopy?.linkedin ?? promoData?.linkedin ?? `Exciting ${category} opportunity: ${title}! Don't miss your chance to participate.`,
        twitter: promoData?.promoCopy?.twitter ?? promoData?.twitter ?? `🚀 ${title} — ${category} open for registrations! Apply now.`,
        email: promoData?.promoCopy?.email ?? promoData?.email ?? `Subject: Join us for ${title}\n\nDear Student,\n\nWe are excited to invite you to ${title}.`,
      });
    } catch (e) {
      setError("Content generation failed. Please check your API key configuration or try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const OUTPUT_TABS: { key: keyof GeneratedContent; label: string; icon: React.ElementType }[] = [
    { key: "description", label: "Event Description", icon: FileText },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin },
    { key: "twitter", label: "Twitter / X", icon: Twitter },
    { key: "email", label: "Email Template", icon: Mail },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-primary-600" />
          AI Content Assistant
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Generate event descriptions, social posts, and email templates using Gemini AI (SRD §3.6).
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="border border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Event Details</CardTitle>
            <CardDescription className="text-xs">Provide event information to generate tailored content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-text-primary mb-1.5 block">
                Event Title <span className="text-danger">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. National AI Hackathon 2026"
                className="text-sm"
              />
              {title.length > 0 && title.trim().length < 5 && (
                <p className="text-[11px] text-danger mt-1">Title must be at least 5 characters</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-text-primary mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs border transition-colors",
                      category === c
                        ? "bg-primary-600 text-white border-primary-600"
                        : "border-border text-text-secondary hover:border-primary-300"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-text-primary mb-1.5 block">Target Department <span className="text-text-muted">(optional)</span></label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science & AI"
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-text-primary mb-2 block">Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all",
                      tone === t.value
                        ? "border-primary-500 bg-primary-50"
                        : "border-border hover:border-primary-300"
                    )}
                  >
                    <p className={cn("text-xs font-semibold", tone === t.value ? "text-primary-700" : "text-text-primary")}>
                      {t.label}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !isReady}
              className="w-full gap-2 bg-gradient-primary text-white"
            >
              {isGenerating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Generating with Gemini AI...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Content</>
              )}
            </Button>

            {error && (
              <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg p-3">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Output Panel */}
        <div className="space-y-4">
          {!generated && !isGenerating && (
            <Card className="border border-dashed border-border h-full">
              <CardContent className="p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                  <Megaphone className="w-7 h-7 text-primary-500" />
                </div>
                <p className="font-semibold text-text-primary mb-1">Ready to generate</p>
                <p className="text-sm text-text-muted max-w-xs">
                  Fill in the event details and click <strong>Generate Content</strong> to create AI-powered copy.
                </p>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card className="border border-primary-200 bg-primary-50/50">
              <CardContent className="p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mb-4" />
                <p className="font-semibold text-primary-700">Generating with Gemini AI…</p>
                <p className="text-xs text-primary-600 mt-1">Creating description, LinkedIn, Twitter, and email</p>
              </CardContent>
            </Card>
          )}

          {generated && OUTPUT_TABS.map(({ key, label, icon: Icon }) => (
            <Card key={key} className="border border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary-600" />
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => handleCopy(key, generated[key])}
                  >
                    {copiedTab === key ? (
                      <><Check className="w-3 h-3 text-success" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Textarea
                  value={generated[key]}
                  readOnly
                  rows={key === "email" ? 8 : key === "description" ? 5 : 3}
                  className="text-xs bg-surface-muted border-border resize-none font-mono leading-relaxed"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
