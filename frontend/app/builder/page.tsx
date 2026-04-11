"use client";
import { useEffect, useState } from "react";
import SpecEditor from "@/components/SpecEditor";
import { defaultSpec } from "@/lib/types";
import type { AgentSpec } from "@/lib/types";
import { Loader2, Sparkles } from "lucide-react";

export default function BuilderPage() {
  const [spec, setSpec] = useState<AgentSpec | null>(null);
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    const idea = sessionStorage.getItem("agentIdea");
    if (idea) {
      sessionStorage.removeItem("agentIdea");
      refineIdea(idea);
    } else {
      setSpec(defaultSpec());
    }
  }, []);

  async function refineIdea(idea: string) {
    setRefining(true);
    // Simulate AI refinement (replace with real API call)
    await new Promise((r) => setTimeout(r, 1200));
    const refined = defaultSpec();
    refined.name = idea.split(" ").slice(0, 4).join(" ");
    refined.description = idea;
    refined.role = `You are an AI agent specialized in: ${idea}`;
    refined.instructions = `1. Understand the user's request\n2. Process it step by step\n3. Return a clear, structured response`;
    setSpec(refined);
    setRefining(false);
  }

  if (refining) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-violet-400" />
        <p className="text-slate-400 text-sm">Refining your idea into a spec...</p>
      </div>
    );
  }

  if (!spec) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles size={20} className="text-violet-400" />
        <h1 className="text-xl font-semibold text-white">Agent Spec Builder</h1>
        <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
          spec v{spec.spec_version}
        </span>
      </div>
      <SpecEditor spec={spec} onChange={setSpec} />
    </div>
  );
}
