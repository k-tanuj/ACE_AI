// app/(public)/search/page.tsx — Smart Search page
"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Sparkles, Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard, EventCardSkeleton } from "@/components/events/EventCard";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [intent, setIntent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setQuery(q); doSearch(q); }
  }, []);

  async function doSearch(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setResults(data.events ?? []);
      setIntent(data.intent);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
    router.replace(`/search?q=${encodeURIComponent(searchQuery)}`, { scroll: false });
  }

  const EXAMPLES = [
    "AI hackathons for CSE students in Chennai this month",
    "Remote internships for Python and ML",
    "Beginner-friendly cybersecurity workshops",
    "Competitions I can apply to before next Friday",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-surface/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-white" /></div>
            <span className="font-bold text-text-primary">ACE AI</span>
          </Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
              placeholder='Try: "Find AI hackathons for CSE students in Chennai"'
              className="w-full pl-11 pr-4 h-10 rounded-2xl border border-border bg-surface-muted text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              id="smart-search-input"
              autoFocus
            />
          </div>
          <Button onClick={() => doSearch()} disabled={loading} className="shrink-0 rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Not searched yet */}
        {!searched && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Smart Opportunity Search</h1>
            <p className="text-text-secondary mb-8 max-w-md mx-auto">Ask naturally. ACE AI understands what you need and finds the best matching opportunities.</p>
            <p className="text-sm font-medium text-text-muted mb-3">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => { setQuery(ex); doSearch(ex); }} className="text-sm px-4 py-2 bg-surface border border-border rounded-xl text-text-secondary hover:border-primary-300 hover:text-primary-700 transition-all text-left">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div>
            <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
              <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
              <span>Parsing your query and finding the best matches...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <EventCardSkeleton key={i} />)}
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <>
            {/* Intent card */}
            {intent && (
              <div className="mb-5 p-4 bg-primary-50 border border-primary-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-semibold text-primary-700">ACE AI understood your query</span>
                </div>
                <p className="text-sm text-primary-600">{(intent as { intent?: string }).intent ?? query}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(intent as { eventTypes?: string[] }).eventTypes?.map((t) => <Badge key={t} variant="default" className="text-[10px]">{t}</Badge>)}
                  {(intent as { location?: string }).location && <Badge variant="info" className="text-[10px]">{(intent as { location: string }).location}</Badge>}
                  {(intent as { isRemote?: boolean }).isRemote && <Badge variant="success" className="text-[10px]">Remote</Badge>}
                </div>
              </div>
            )}

            <p className="text-sm text-text-muted mb-4">{results.length} results for &quot;{searchParams.get("q")}&quot;</p>

            {results.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg font-semibold text-text-primary mb-2">No results found</p>
                <p className="text-text-muted text-sm mb-4">Try different keywords or browse all opportunities.</p>
                <Button variant="secondary" asChild><Link href="/events">Browse All Events</Link></Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(results as Record<string, unknown>[]).map((event) => (
                  <EventCard
                    key={event.id as string}
                    event={event as never}
                    showMatchScore
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
