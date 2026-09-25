// components/home/HeroSearch.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, ArrowRight, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      if (isAuthenticated) {
        router.push("/search");
      } else {
        router.push("/login?from=%2Fsearch");
      }
      return;
    }

    const searchUrl = `/search?q=${encodeURIComponent(trimmed)}`;
    if (isAuthenticated) {
      router.push(searchUrl);
    } else {
      router.push(`/login?from=${encodeURIComponent(searchUrl)}`);
    }
  }

  function handleQuickChip(text: string) {
    setQuery(text);
    const searchUrl = `/search?q=${encodeURIComponent(text)}`;
    if (isAuthenticated) {
      router.push(searchUrl);
    } else {
      router.push(`/login?from=${encodeURIComponent(searchUrl)}`);
    }
  }

  return (
    <div className="mb-8 max-w-2xl">
      <form onSubmit={handleSubmit} className="flex gap-3 mb-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 rounded-2xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-card transition-all"
            placeholder='Try: "AI hackathons for CSE students in Chennai this month"'
          />
        </div>
        <Button type="submit" size="lg" className="rounded-2xl px-6 shrink-0">
          Search <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </form>

      {/* Auth indicator */}
      <div className="flex items-center justify-between px-1 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          {isAuthenticated ? (
            <span className="flex items-center gap-1 text-success font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Smart Search active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <Lock className="w-3.5 h-3.5" />
              Sign in required to run Smart Search
            </span>
          )}
          <span className="text-border">•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary-500" />
            Natural Language AI
          </span>
        </div>
      </div>

      {/* Suggested prompts */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-xs text-text-muted">Trending:</span>
        {[
          "AI hackathons in Chennai",
          "Remote Python internships",
          "Cybersecurity workshops",
        ].map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleQuickChip(chip)}
            className="text-xs px-2.5 py-1 rounded-lg bg-surface border border-border text-text-secondary hover:border-primary-300 hover:text-primary-700 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
