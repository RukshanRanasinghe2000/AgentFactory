"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Wrench } from "lucide-react";

const placeholders = [
  "An AI that reviews code for performance issues...",
  "A research agent that summarizes papers...",
  "An agent that monitors my website and alerts me...",
  "An AI customer support agent for my SaaS...",
];

export default function IdeaInput() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const placeholder = placeholders[Math.floor(Date.now() / 5000) % placeholders.length];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;
    setLoading(true);
    // Store idea in sessionStorage, navigate to builder
    sessionStorage.setItem("agentIdea", idea.trim());
    router.push("/builder");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="glass rounded-2xl p-2 flex items-center gap-2 glow">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 bg-transparent resize-none px-3 py-2 text-sm text-white placeholder-slate-500 outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <button
          type="submit"
          disabled={!idea.trim() || loading}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {loading ? "Thinking..." : "Build Agent"}
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Press Enter or click Build Agent — we&apos;ll handle the rest
      </p>
      <div className="flex items-center justify-center mt-4">
        <a
          href="/builder"
          className="flex items-center gap-2 px-5 py-2 rounded-xl border border-slate-700 hover:border-violet-500 text-sm text-slate-300 hover:text-white bg-slate-800/50 hover:bg-violet-600/10 transition-all"
        >
          <Wrench size={14} className="text-violet-400" />
          Open Builder directly
        </a>
      </div>
    </form>
  );
}
