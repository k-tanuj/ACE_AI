// app/app/chat/page.tsx — ACE Chat with event card suggestions
"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, RefreshCcw, MessageCircle, Sparkles, Calendar, MapPin, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

interface EventCard {
  id: string;
  title: string;
  type: string;
  location: string;
  deadline: string;
  qualityScore: number;
  organizer: string;
  credibilityScore: number;
  slug: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
  events?: EventCard[];
}

const TYPE_COLORS: Record<string, string> = {
  HACKATHON: "bg-purple-100 text-purple-700",
  INTERNSHIP: "bg-blue-100 text-blue-700",
  WORKSHOP: "bg-amber-100 text-amber-700",
  COMPETITION: "bg-red-100 text-red-700",
  SCHOLARSHIP: "bg-green-100 text-green-700",
  CERTIFICATION: "bg-cyan-100 text-cyan-700",
  CONFERENCE: "bg-pink-100 text-pink-700",
};

const SUGGESTED_PROMPTS = [
  "Find AI hackathons for CSE students",
  "Show remote internships for Python developers",
  "What events have the highest trust scores?",
];

function EventCardUI({ event }: { event: EventCard }) {
  const badgeClass = TYPE_COLORS[event.type] || "bg-gray-100 text-gray-700";
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-text-primary truncate">{event.title}</h4>
          <p className="text-xs text-text-muted mt-0.5">{event.organizer}</p>
        </div>
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", badgeClass)}>
          {event.type}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-primary-500" />
          {event.location}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-warning" />
          Deadline: {event.deadline}
        </span>
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-text-muted">
            <ShieldCheck className="w-3 h-3 text-success" />
            EQS: <strong className="text-text-primary">{event.qualityScore}</strong>/100
          </span>
          <span className="text-text-muted">
            Trust: <strong className="text-text-primary">{event.credibilityScore}%</strong>
          </span>
        </div>
        <Link href={`/events/${event.slug}`}>
          <Button size="sm" className="h-7 px-3 text-xs rounded-lg gap-1">
            View Event <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content: "Hello! I'm ACE, your AI assistant. I can help you find opportunities, explain event details, check eligibility, and guide your application journey. What are you looking for today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Chat failed");
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Vercel AI SDK v3: text tokens
          if (trimmed.startsWith("0:")) {
            try {
              const token = JSON.parse(trimmed.slice(2));
              content += token;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content } : m))
              );
            } catch { }
          // Data annotations (event cards)
          } else if (trimmed.startsWith("2:")) {
            try {
              const dataArr = JSON.parse(trimmed.slice(2));
              for (const item of dataArr) {
                if (item?.events) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, events: item.events } : m
                    )
                  );
                }
              }
            } catch { }
          // Mock fallback SSE
          } else if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                content += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content } : m))
                );
              }
            } catch { }
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "I encountered an error. Please try again." }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([
      {
        id: "intro",
        role: "assistant",
        content: "Chat cleared. How can I help you find your next opportunity?",
      },
    ]);
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">ACE Chat</h1>
            <p className="text-xs text-text-muted flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary-500" /> AI-powered opportunity assistant
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={clearChat} title="Clear chat">
          <RefreshCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                msg.role === "assistant"
                  ? "bg-gradient-primary"
                  : "bg-surface-muted border border-border"
              )}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-text-muted" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              {/* Bubble */}
              <div
                className={cn(
                  "max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-surface border border-border text-text-primary"
                    : "bg-primary-600 text-white ml-auto"
                )}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => (
                          <strong className="font-semibold text-text-primary">{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
                        ),
                        li: ({ children }) => <li className="text-sm">{children}</li>,
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            className="text-primary-600 underline hover:text-primary-700"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                        code: ({ children }) => (
                          <code className="bg-surface-muted px-1 py-0.5 rounded text-xs font-mono">
                            {children}
                          </code>
                        ),
                        h3: ({ children }) => (
                          <h3 className="font-bold text-sm mb-1">{children}</h3>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : loading ? (
                    <span className="flex items-center gap-1 text-text-muted">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                    </span>
                  ) : null
                ) : (
                  msg.content
                )}
              </div>

              {/* Event Cards */}
              {msg.events && msg.events.length > 0 && (
                <div className="space-y-2 max-w-[90%]">
                  <p className="text-xs text-text-muted font-medium pl-1">
                    Matched opportunities from the platform:
                  </p>
                  {msg.events.map((event) => (
                    <EventCardUI key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 2 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => sendMessage(prompt)}
              className="text-xs px-3 py-2 bg-surface border border-border rounded-xl text-text-secondary hover:border-primary-300 hover:text-primary-700 transition-all text-left"
            >
              <MessageCircle className="inline w-3 h-3 mr-1" />
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask ACE about opportunities, eligibility, trust scores..."
          disabled={loading}
          className="flex-1 rounded-2xl h-12"
          id="chat-input"
        />
        <Button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          size="icon"
          className="h-12 w-12 rounded-2xl"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
