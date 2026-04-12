"use client";
import { useState, useEffect } from "react";
import { X, Key, Eye, EyeOff, CheckCircle } from "lucide-react";

export interface LLMSettings {
  provider: "openai" | "groq" | "anthropic" | "ollama";
  apiKey: string;
  model: string;
  baseUrl: string;
}

const STORAGE_KEY = "agentfactory_llm_settings";

const PROVIDER_DEFAULTS: Record<LLMSettings["provider"], { model: string; baseUrl: string; placeholder: string }> = {
  openai:    { model: "gpt-4o-mini",              baseUrl: "",                              placeholder: "sk-..." },
  groq:      { model: "llama-3.3-70b-versatile",  baseUrl: "https://api.groq.com/openai/v1", placeholder: "gsk_..." },
  anthropic: { model: "claude-haiku-4-5",          baseUrl: "",                              placeholder: "sk-ant-..." },
  ollama:    { model: "llama3.2",                  baseUrl: "http://localhost:11434/v1",      placeholder: "ollama" },
};

export function loadSettings(): LLMSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSettings(s: LLMSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface Props {
  onClose: () => void;
  onSaved: (s: LLMSettings) => void;
}

export default function ApiKeyModal({ onClose, onSaved }: Props) {
  const [settings, setSettings] = useState<LLMSettings>(() => {
    return loadSettings() ?? { provider: "groq", apiKey: "", model: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1" };
  });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update model/baseUrl when provider changes
  function setProvider(p: LLMSettings["provider"]) {
    const defaults = PROVIDER_DEFAULTS[p];
    setSettings((s) => ({ ...s, provider: p, model: defaults.model, baseUrl: defaults.baseUrl }));
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSaved(settings); onClose(); }, 800);
  }

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const defaults = PROVIDER_DEFAULTS[settings.provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass glow rounded-2xl w-full max-w-md flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-violet-400" />
            <p className="text-sm font-medium text-white">AI Refinement Settings</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4">
          <p className="text-xs text-slate-400">
            Configure your LLM provider to auto-generate agent specs from your idea.
            Keys are stored locally in your browser only.
          </p>

          {/* Provider */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Provider</label>
            <div className="grid grid-cols-4 gap-2">
              {(["groq", "openai", "anthropic", "ollama"] as LLMSettings["provider"][]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                    settings.provider === p
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                  }`}
                >
                  {p === "openai" ? "OpenAI" : p === "groq" ? "Groq" : p === "anthropic" ? "Anthropic" : "Ollama"}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">
              {settings.provider === "ollama" ? "API Key (optional)" : "API Key"}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                placeholder={defaults.placeholder}
                className="field-input pr-9"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Model */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Model</label>
            <input
              value={settings.model}
              onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
              placeholder={defaults.model}
              className="field-input"
            />
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Base URL <span className="text-slate-600 normal-case font-normal">optional</span></label>
            <input
              value={settings.baseUrl}
              onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
              placeholder="https://api.groq.com/openai/v1"
              className="field-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-600">Stored in localStorage — never sent to our servers</p>
          <button
            onClick={handleSave}
            disabled={!settings.apiKey.trim() && settings.provider !== "ollama"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            {saved ? <><CheckCircle size={13} /> Saved!</> : "Save & Use"}
          </button>
        </div>
      </div>
    </div>
  );
}
