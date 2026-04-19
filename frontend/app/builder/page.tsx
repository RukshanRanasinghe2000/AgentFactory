"use client";
import { useEffect, useState, useCallback } from "react";
import SpecEditor from "@/components/SpecEditor";
import ClarificationStep, { type ClarifyQuestion } from "@/components/ClarificationStep";
import { defaultSpec } from "@/lib/types";
import type { AgentSpec } from "@/lib/types";
import { Sparkles, AlertCircle, RefreshCw } from "lucide-react";

type Stage = "clarifying" | "loading" | "editing" | "error";

export default function BuilderPage() {
  const [stage, setStage] = useState<Stage>("loading");
  const [spec, setSpec] = useState<AgentSpec | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [providerInfo, setProviderInfo] = useState("");
  const [lastIdea, setLastIdea] = useState("");
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);

  useEffect(() => {
    const idea = sessionStorage.getItem("agentIdea");
    if (idea) {
      sessionStorage.removeItem("agentIdea");
      setLastIdea(idea);
      fetchClarifications(idea);
    } else {
      setSpec(defaultSpec());
      setStage("editing");
    }
  }, []);

  // ── Step 1: fetch clarification questions ──────────────────────────────────
  async function fetchClarifications(idea: string) {
    setStage("loading");
    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setQuestions(data.questions ?? []);
      setStage("clarifying");
    } catch {
      // If clarify fails, skip straight to refine
      refineIdea(idea, {});
    }
  }

  // ── Step 2: refine with idea + answers ─────────────────────────────────────
  const refineIdea = useCallback(async (idea: string, answers: Record<string, string>) => {
    setStage("loading");
    setErrorMsg("");

    // Build enriched context from answers
    const answeredPairs = Object.entries(answers).filter(([, v]) => v.trim());
    const enrichedIdea = answeredPairs.length > 0
      ? `${idea}\n\nAdditional context:\n${answeredPairs.map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
      : idea;

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: enrichedIdea }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Unknown error");

      const p = data.spec;
      const refined = defaultSpec();
      refined.name           = p.name           ?? refined.name;
      refined.description    = p.description    ?? idea;
      refined.version        = p.version        ?? "0.1.0";
      refined.license        = p.license        ?? "MIT";
      refined.role           = p.role           ?? "";
      refined.instructions   = p.instructions   ?? "";
      refined.output_format  = p.output_format  ?? "json";
      refined.json_output_template = p.json_output_template
        ? (() => {
            try {
              const val = typeof p.json_output_template === "string"
                ? JSON.parse(p.json_output_template)
                : p.json_output_template;
              return JSON.stringify(val, null, 2);
            } catch {
              return typeof p.json_output_template === "string"
                ? p.json_output_template
                : JSON.stringify(p.json_output_template, null, 2);
            }
          })()
        : "";
      refined.execution_mode = p.execution_mode ?? "sequential";
      refined.max_iterations = p.max_iterations ?? 5;
      refined.enforcement    = p.enforcement    ?? "";
      if (p.memory_type) refined.memory = { type: p.memory_type };
      if (p.suggested_interfaces?.length) {
        refined.interfaces = p.suggested_interfaces.map((t: string) => ({ type: t }));
      }
      if (data.provider && data.model) setProviderInfo(`${data.provider} · ${data.model}`);

      setSpec(refined);
      setStage("editing");
    } catch (err) {
      setErrorMsg(String(err));
      setStage("error");
      if (!spec) {
        const s = defaultSpec();
        s.name = idea.split(" ").slice(0, 5).join(" ");
        s.description = idea;
        setSpec(s);
      }
    }
  }, [spec]);

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (stage === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        {/* Icon circle — matches the image style */}
        <div className="relative w-20 h-20">
          <div className="w-20 h-20 rounded-full border-2 border-violet-700 flex items-center justify-center">
            <Sparkles size={28} className="text-violet-400" />
          </div>
          {/* Spinning arc overlay */}
          <svg className="absolute inset-0 w-20 h-20 animate-spin" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="38" fill="none" stroke="url(#arc)" strokeWidth="2"
              strokeDasharray="60 180" strokeLinecap="round" />
            <defs>
              <linearGradient id="arc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-white font-semibold text-base">
            {questions.length === 0 ? "Analysing your idea..." : "Generating your agent spec..."}
          </p>
          <p className="text-slate-500 text-sm mt-1">Calling AI to refine your idea</p>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full animate-[progress_2s_ease-in-out_infinite]"
            style={{ animation: "progress 2s ease-in-out infinite" }} />
        </div>

        <style>{`
          @keyframes progress {
            0%   { width: 0%;   margin-left: 0%; }
            50%  { width: 60%;  margin-left: 20%; }
            100% { width: 0%;   margin-left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // ── Clarification step ─────────────────────────────────────────────────────
  if (stage === "clarifying") {
    return (
      <ClarificationStep
        idea={lastIdea}
        questions={questions}
        onSubmit={(answers) => refineIdea(lastIdea, answers)}
        onSkip={() => refineIdea(lastIdea, {})}
      />
    );
  }

  if (!spec) return null;

  // ── Editor ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        
        <h1 className="text-xl font-semibold text-white">Agent Spec Builder</h1>
        <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
          spec v{spec.spec_version}
        </span>
        {providerInfo && (
          <span className="text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-700/40 px-2 py-1 rounded">
            {providerInfo}
          </span>
        )}
      </div>

      {stage === "error" && (
        <div className="glass rounded-xl px-4 py-3 mb-6 flex items-start gap-3 border border-red-800/50">
          <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-300 font-medium">AI refinement failed</p>
            <p className="text-xs text-slate-400 mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => lastIdea && refineIdea(lastIdea, {})}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors shrink-0"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      <SpecEditor spec={spec} onChange={setSpec} />
    </div>
  );
}
