"use client";
import { useEffect, useState, useCallback } from "react";
import SpecEditor from "@/components/SpecEditor";
import { defaultSpec } from "@/lib/types";
import type { AgentSpec } from "@/lib/types";
import { Loader2, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

type RefineStatus = "idle" | "loading" | "error";

export default function BuilderPage() {
  const [spec, setSpec] = useState<AgentSpec | null>(null);
  const [status, setStatus] = useState<RefineStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [providerInfo, setProviderInfo] = useState<string>("");
  const [lastIdea, setLastIdea] = useState("");

  useEffect(() => {
    const idea = sessionStorage.getItem("agentIdea");
    if (idea) {
      sessionStorage.removeItem("agentIdea");
      refineIdea(idea);
    } else {
      setSpec(defaultSpec());
    }
  }, []);

  const refineIdea = useCallback(async (idea: string) => {
    setStatus("loading");
    setErrorMsg("");
    setLastIdea(idea);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Unknown error");
      }

      const p = data.spec;
      const refined = defaultSpec();
      refined.name             = p.name             ?? refined.name;
      refined.description      = p.description      ?? idea;
      refined.version          = p.version          ?? "0.1.0";
      refined.license          = p.license          ?? "MIT";
      refined.role             = p.role             ?? "";
      refined.instructions     = p.instructions     ?? "";
      refined.output_format    = p.output_format    ?? "json";
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
      refined.execution_mode   = p.execution_mode   ?? "sequential";
      refined.max_iterations   = p.max_iterations   ?? 5;
      refined.enforcement      = p.enforcement      ?? "";
      if (p.memory_type) refined.memory = { type: p.memory_type };
      if (p.suggested_interfaces?.length) {
        refined.interfaces = p.suggested_interfaces.map((t: string) => ({ type: t }));
      }

      if (data.provider && data.model) {
        setProviderInfo(`${data.provider} · ${data.model}`);
      }

      setSpec(refined);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
      if (!spec) setSpec(buildFallbackSpec(idea));
    }
  }, [spec]);

  function buildFallbackSpec(idea: string): AgentSpec {
    const s = defaultSpec();
    s.name         = idea.split(" ").slice(0, 5).join(" ");
    s.description  = idea;
    s.role         = `You are an AI agent specialized in: ${idea}`;
    s.instructions = `1. Understand the user's request\n2. Process it step by step\n3. Return a clear, structured response`;
    return s;
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-violet-800 flex items-center justify-center">
            <Sparkles size={24} className="text-violet-400" />
          </div>
          <Loader2 size={20} className="animate-spin text-violet-400 absolute -top-1 -right-1" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium text-sm">Generating your agent spec...</p>
          <p className="text-slate-500 text-xs mt-1">Calling AI to refine your idea</p>
        </div>
      </div>
    );
  }

  if (!spec) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Sparkles size={20} className="text-violet-400" />
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

      {/* Error banner */}
      {status === "error" && (
        <div className="glass rounded-xl px-4 py-3 mb-6 flex items-start gap-3 border border-red-800/50">
          <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-300 font-medium">AI refinement failed</p>
            <p className="text-xs text-slate-400 mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => lastIdea && refineIdea(lastIdea)}
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
