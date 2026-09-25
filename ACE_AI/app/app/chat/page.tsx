// app/app/chat/page.tsx — ACE Chat
"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, RefreshCcw, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message { role: "user" | "assistant"; content: string; id: string; }

const SUGGESTED_PROMPTS = [
  "Find AI hackathons for CSE students in Chennai this month",
  "Show remote internships for Python developers",
  "Why is HackAI Chennai suitable for me?",
  "What events have the highest trust scores?",
  "How do I complete my profile for better recommendations?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "intro", role: "assistant", content: "Hello! I'm ACE, your AI assistant. I can help you find opportunities, explain event details, check eligibility, and guide your application journey. What are you looking for today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
        body: JSON.stringify({ messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok) throw new Error("Chat failed");
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                content += parsed.text;
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content } : m));
              }
            } catch { }
          }
        }
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "I encountered an error. Please try again." } : m));
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([{ id: "intro", role: "assistant", content: "Chat cleared. How can I help you find your next opportunity?" }]);
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
            <p className="text-xs text-text-muted flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary-500" /> AI-powered opportunity assistant</p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={clearChat} title="Clear chat">
          <RefreshCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", msg.role === "assistant" ? "bg-gradient-primary" : "bg-surface-muted border border-border")}>
              {msg.role === "assistant" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-text-muted" />}
            </div>
            <div className={cn("max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap", msg.role === "assistant" ? "bg-surface border border-border text-text-primary" : "bg-primary-600 text-white")}>
              {msg.content || (loading && msg.role === "assistant" && <span className="flex items-center gap-1 text-text-muted"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...</span>)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length <= 2 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.slice(0, 3).map((prompt, i) => (
            <button key={i} onClick={() => sendMessage(prompt)} className="text-xs px-3 py-2 bg-surface border border-border rounded-xl text-text-secondary hover:border-primary-300 hover:text-primary-700 transition-all text-left">
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
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask ACE about opportunities, eligibility, trust scores..."
          disabled={loading}
          className="flex-1 rounded-2xl h-12"
          id="chat-input"
        />
        <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} size="icon" className="h-12 w-12 rounded-2xl">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
