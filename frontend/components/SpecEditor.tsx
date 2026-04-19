"use client";
import { useState } from "react";
import type { AgentSpec, AgentTool, AgentInterface, AgentSkill, QueryParam } from "@/lib/types";
import FieldBlock from "./FieldBlock";
import OutputSchemaBuilder from "./OutputSchemaBuilder";
import PreviewPopup from "./PreviewPopup";
import TestAgentPanel from "./TestAgentPanel";
import { Plus, Trash2, Download, Play, Key, ShieldAlert, X, MessageSquare, PenLine } from "lucide-react";
import clsx from "clsx";

interface Props {
  spec: AgentSpec;
  onChange: (s: AgentSpec) => void;
}

type Tab = "core" | "model" | "interfaces" | "tools" | "preview";

export default function SpecEditor({ spec, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("core");
  const [popup, setPopup] = useState<{ label: string; content: string } | null>(null);
  const [showTest, setShowTest] = useState(false);
  const [confirmStep, setConfirmStep] = useState<"groq" | "credentials">("groq");
  const [showGroqConfirm, setShowGroqConfirm] = useState(false);
  // Temporary test credentials — state only, wiped on close
  const [toolKeys, setToolKeys] = useState<Record<string, string>>({});
  // Per-tool query param mode: "extract" (LLM extracts from chat) | "manual" (user enters)
  const [queryModes, setQueryModes] = useState<Record<string, "extract" | "manual">>({});
  // Manual query param values — keyed as "toolName.paramKey"
  const [manualQueryValues, setManualQueryValues] = useState<Record<string, string>>({});

  // Tools that need credentials at test time
  const toolsNeedingInput = spec.tools.filter(
    (t) => (t.authentication && t.authentication.type !== "none") ||
            (t.query_params && t.query_params.length > 0)
  );

  function openTestFlow() {
    setToolKeys({});
    setQueryModes({});
    setManualQueryValues({});
    setConfirmStep("groq");
    setShowGroqConfirm(true);
  }

  function handleGroqConfirmed() {
    if (toolsNeedingInput.length > 0) {
      setConfirmStep("credentials");
    } else {
      setShowGroqConfirm(false);
      setShowTest(true);
    }
  }

  function handleCredentialsConfirmed() {
    setShowGroqConfirm(false);
    setShowTest(true);
  }

  function handleTestClose() {
    setShowTest(false);
    setToolKeys({});
    setQueryModes({});
    setManualQueryValues({});
  }

  function buildTestSpec(): AgentSpec {
    const tools = spec.tools.map((t) => {
      let updated = { ...t };
      // Inject API key
      const key = toolKeys[t.name];
      if (key && t.authentication) {
        updated = { ...updated, authentication: { ...t.authentication, api_key: key, token: key } };
      }
      // If manual mode, append query params directly to URL
      if (queryModes[t.name] === "manual" && t.query_params?.length && updated.transport.url) {
        const qs = t.query_params
          .map((p) => {
            const val = manualQueryValues[`${t.name}.${p.key}`] ?? p.default ?? "";
            return val ? `${encodeURIComponent(p.key)}=${encodeURIComponent(val)}` : null;
          })
          .filter(Boolean).join("&");
        if (qs) {
          const base = updated.transport.url.replace(/[?&]$/, "").split("?")[0];
          updated = { ...updated, transport: { ...updated.transport, url: `${base}?${qs}` } };
        }
      }
      return updated;
    });
    return {
      ...spec, tools,
      model: { ...spec.model, provider: "groq", name: "llama-3.3-70b-versatile", base_url: "https://api.groq.com/openai/v1", authentication: { type: "api-key", api_key: "" } },
    };
  }

  function set<K extends keyof AgentSpec>(key: K, value: AgentSpec[K]) {
    onChange({ ...spec, [key]: value });
  }
  function setModel(key: keyof AgentSpec["model"], value: string | number) {
    onChange({ ...spec, model: { ...spec.model, [key]: value } });
  }
  function setAuth(key: keyof AgentSpec["model"]["authentication"], value: string) {
    onChange({ ...spec, model: { ...spec.model, authentication: { ...spec.model.authentication, [key]: value } } });
  }

  function downloadSpec() {
    const yaml = buildYaml(spec);
    const blob = new Blob([yaml], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spec.name || "agent"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "core", label: "Core" },
    { id: "model", label: "Model" },
    { id: "interfaces", label: "Interfaces" },
    { id: "tools", label: "Tools" },
    { id: "preview", label: "Preview" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-0">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx("px-4 py-2 text-sm rounded-t-lg transition-colors -mb-px border-b-2",
              tab === t.id ? "text-violet-400 border-violet-500" : "text-slate-400 border-transparent hover:text-white"
            )}
          >{t.label}</button>
        ))}
        <div className="ml-auto flex gap-2 pb-2">
          <button onClick={downloadSpec} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <Download size={13} /> Export .md
          </button>
          <button onClick={openTestFlow} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-700 hover:bg-violet-600 text-white transition-colors">
            <Play size={13} /> Test Agent
          </button>
        </div>
      </div>

      {/* ── Step 1: Groq notice ── */}
      {showGroqConfirm && confirmStep === "groq" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowGroqConfirm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative glass glow rounded-2xl w-full max-w-md flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-900/40 shrink-0"><Play size={16} className="text-amber-400" /></div>
                <div>
                  <p className="text-white font-semibold text-sm">Testing Environment Notice</p>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    The testing environment currently supports <span className="text-violet-300 font-medium">Groq only</span>. Your agent will be tested using:
                  </p>
                  <div className="mt-3 glass rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-slate-300"><span className="text-emerald-400 font-medium">groq</span>{" · "}<span className="text-slate-200">llama-3.3-70b-versatile</span></span>
                  </div>
                  {spec.model.provider !== "groq" && (
                    <p className="text-xs text-amber-400/80 mt-2">Your configured model (<span className="font-medium">{spec.model.provider} · {spec.model.name}</span>) will not be used during testing.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowGroqConfirm(false)} className="flex-1 px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors">Cancel</button>
                <button onClick={handleGroqConfirmed} className="flex-1 px-4 py-2 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors flex items-center justify-center gap-1.5">
                  <Play size={12} /> Continue with Groq
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Tool API keys ── */}
      {showGroqConfirm && confirmStep === "credentials" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowGroqConfirm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative glass glow rounded-2xl w-full max-w-lg flex flex-col shadow-2xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key size={15} className="text-violet-400" />
                <p className="text-sm font-medium text-white">Tool Credentials</p>
              </div>
              <button onClick={() => setShowGroqConfirm(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
            </div>

            <div className="mx-5 mt-4 flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2.5">
              <ShieldAlert size={13} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Your API keys are stored <span className="font-medium text-amber-300">temporarily in memory only</span> and removed automatically when you close the test panel. They are never saved to disk or localStorage.
              </p>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {toolsNeedingInput.map((tool) => (
                <div key={tool.name} className="glass rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-xs font-medium text-violet-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />{tool.name}
                  </p>

                  {/* API key */}
                  {tool.authentication && tool.authentication.type !== "none" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400">API Key <span className="text-slate-600">({tool.authentication?.type})</span></label>
                      <input type="password" value={toolKeys[tool.name] ?? ""}
                        onChange={(e) => setToolKeys((p) => ({ ...p, [tool.name]: e.target.value }))}
                        placeholder={`API key for ${tool.name}`} className="field-input text-sm" />
                    </div>
                  )}

                  {/* Query param mode selector */}
                  {(tool.query_params ?? []).length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-400">Query Parameters</p>
                      {/* Mode toggle */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setQueryModes((p) => ({ ...p, [tool.name]: "extract" }))}
                          className={clsx(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                            (queryModes[tool.name] ?? "extract") === "extract"
                              ? "border-violet-500 text-violet-300 bg-violet-600/10"
                              : "border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 bg-transparent"
                          )}
                        >
                          <MessageSquare size={13} />
                          Extract from chat
                        </button>
                        <button
                          onClick={() => setQueryModes((p) => ({ ...p, [tool.name]: "manual" }))}
                          className={clsx(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                            (queryModes[tool.name] ?? "extract") === "manual"
                              ? "border-violet-500 text-violet-300 bg-violet-600/10"
                              : "border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 bg-transparent"
                          )}
                        >
                          <PenLine size={13} />
                          Enter manually
                        </button>
                      </div>

                      {/* Mode description */}
                      {(queryModes[tool.name] ?? "extract") === "extract" ? (
                        <p className="text-xs text-slate-500 leading-relaxed">
                          The LLM will extract param values from your chat messages automatically. Just type naturally — e.g. <span className="text-slate-300 italic">"weather in Colombo"</span>.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {(tool.query_params ?? []).map((p) => (
                            <div key={p.key} className="flex flex-col gap-1">
                              <label className="text-xs text-slate-400 flex items-center gap-1">
                                {p.key}
                                {p.required && <span className="text-red-400">*</span>}
                                {p.description && <span className="text-slate-600">— {p.description}</span>}
                              </label>
                              <input
                                type="text"
                                value={manualQueryValues[`${tool.name}.${p.key}`] ?? p.default ?? ""}
                                onChange={(e) => setManualQueryValues((prev) => ({ ...prev, [`${tool.name}.${p.key}`]: e.target.value }))}
                                placeholder={p.default || p.description || p.key}
                                className="field-input text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-slate-800 flex gap-3">
              <button onClick={() => setShowGroqConfirm(false)} className="flex-1 px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors">Cancel</button>
              <button onClick={handleCredentialsConfirmed} className="flex-1 px-4 py-2 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors flex items-center justify-center gap-1.5">
                <Play size={12} /> Start Testing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Panel */}
      {showTest && (
        <TestAgentPanel spec={buildTestSpec()} onClose={handleTestClose} />
      )}

      {/* ── CORE TAB ── */}
      {tab === "core" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldBlock label="Agent Name" hint="What should we call this agent?">
            <input value={spec.name} onChange={(e) => set("name", e.target.value)}
              placeholder="My Awesome Agent" className="field-input" />
          </FieldBlock>
          <FieldBlock label="Version" hint="Semantic version">
            <input value={spec.version} onChange={(e) => set("version", e.target.value)}
              placeholder="1.0.0" className="field-input" />
          </FieldBlock>
          <FieldBlock label="License" hint="How others may use this agent">
            <input value={spec.license} onChange={(e) => set("license", e.target.value)}
              placeholder="MIT" className="field-input" />
          </FieldBlock>
          <FieldBlock label="Author" hint="Who built this?">
            <input value={spec.author} onChange={(e) => set("author", e.target.value)}
              placeholder="Jane Doe <jane@example.com>" className="field-input" />
          </FieldBlock>
          <FieldBlock label="Provider Name" hint="Company or team behind this agent">
            <input value={spec.provider.name} onChange={(e) => set("provider", { ...spec.provider, name: e.target.value })}
              placeholder="My Company" className="field-input" />
          </FieldBlock>
          <FieldBlock label="Provider URL" hint="Homepage or docs link">
            <input value={spec.provider.url} onChange={(e) => set("provider", { ...spec.provider, url: e.target.value })}
              placeholder="https://mycompany.com" className="field-input" />
          </FieldBlock>
          <FieldBlock label="Description" className="md:col-span-2" onPreview={() => setPopup({ label: "Description", content: spec.description })}>
            <textarea value={spec.description} onChange={(e) => set("description", e.target.value)}
              rows={2} placeholder="What does this agent do?" className="field-input resize-none" />
          </FieldBlock>
          <FieldBlock label="Role" className="md:col-span-2" onPreview={() => setPopup({ label: "Role", content: spec.role })}>
            <textarea value={spec.role} onChange={(e) => set("role", e.target.value)}
              rows={2} placeholder="You are an AI agent that..." className="field-input resize-none" />
          </FieldBlock>
          <FieldBlock label="Instructions" className="md:col-span-2" onPreview={() => setPopup({ label: "Instructions", content: spec.instructions })}>
            <textarea value={spec.instructions} onChange={(e) => set("instructions", e.target.value)}
              rows={5} placeholder="Step-by-step instructions for the agent..." className="field-input resize-none" />
          </FieldBlock>
          <FieldBlock label="Output Format">
            <select value={spec.output_format} onChange={(e) => set("output_format", e.target.value)} className="field-input">
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
              <option value="plain">Plain Text</option>
              <option value="html">HTML</option>
            </select>
          </FieldBlock>
          <OutputSchemaBuilder
            format={spec.output_format}
            fields={spec.output_schema_fields}
            jsonTemplate={spec.json_output_template}
            onChange={(fields) => set("output_schema_fields", fields)}
            onJsonTemplateChange={(v) => set("json_output_template", v)}
          />
          <FieldBlock label="Execution Mode">
            <select value={spec.execution_mode} onChange={(e) => set("execution_mode", e.target.value as AgentSpec["execution_mode"])} className="field-input">
              <option value="sequential">Sequential</option>
              <option value="agentic">Agentic (loop)</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Max Iterations">
            <input type="number" min={1} max={100} value={spec.max_iterations}
              onChange={(e) => set("max_iterations", Number(e.target.value))} className="field-input" />
          </FieldBlock>
          <FieldBlock label="Memory Type">
            <select value={spec.memory.type} onChange={(e) => onChange({ ...spec, memory: { type: e.target.value as AgentSpec["memory"]["type"] } })} className="field-input">
              <option value="none">None</option>
              <option value="short-term">Short-term</option>
              <option value="long-term">Long-term</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Enforcement" className="md:col-span-2" onPreview={() => setPopup({ label: "Enforcement", content: spec.enforcement })}>
            <textarea value={spec.enforcement} onChange={(e) => set("enforcement", e.target.value)}
              rows={2} placeholder="Rules the agent must always follow..." className="field-input resize-none" />
          </FieldBlock>
          {/* Skills */}
          <SkillsEditor skills={spec.skills} onChange={(s) => set("skills", s)} />
        </div>
      )}

      {/* ── MODEL TAB ── */}
      {tab === "model" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldBlock label="Provider">
            <select value={spec.model.provider} onChange={(e) => setModel("provider", e.target.value)} className="field-input">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Model Name">
            <input value={spec.model.name} onChange={(e) => setModel("name", e.target.value)}
              placeholder="gpt-4o" className="field-input" />
          </FieldBlock>
          <FieldBlock label="Base URL" hint="Optional — override API endpoint" className="md:col-span-2">
            <input value={spec.model.base_url} onChange={(e) => setModel("base_url", e.target.value)}
              placeholder="https://api.groq.com/openai/v1" className="field-input" />
          </FieldBlock>
          <FieldBlock label="Auth Type">
            <select value={spec.model.authentication.type} onChange={(e) => setAuth("type", e.target.value as AgentSpec["model"]["authentication"]["type"])} className="field-input">
              <option value="api-key">API Key</option>
              <option value="bearer">Bearer Token</option>
              <option value="none">None</option>
            </select>
          </FieldBlock>
          <FieldBlock label="API Key" hint="Use ${env:VAR_NAME} for env vars">
            <input value={spec.model.authentication.api_key} onChange={(e) => setAuth("api_key", e.target.value)}
              placeholder="${env:MODEL_API_KEY}" className="field-input" />
          </FieldBlock>
          <FieldBlock label="Temperature" hint="0 = deterministic, 1 = creative" className="md:col-span-2">
            <input type="range" min={0} max={1} step={0.1} value={spec.model.temperature}
              onChange={(e) => setModel("temperature", Number(e.target.value))} className="w-full accent-violet-500" />
            <span className="text-xs text-slate-400 mt-1 block">{spec.model.temperature}</span>
          </FieldBlock>
        </div>
      )}

      {/* ── INTERFACES TAB ── */}
      {tab === "interfaces" && (
        <InterfacesEditor interfaces={spec.interfaces} onChange={(v) => set("interfaces", v)} />
      )}

      {/* ── TOOLS TAB ── */}
      {tab === "tools" && (
        <ToolsEditor tools={spec.tools} onChange={(v) => set("tools", v)} />
      )}

      {/* ── PREVIEW TAB ── */}
      {tab === "preview" && (
        <pre className="glass rounded-xl p-5 text-xs text-slate-300 overflow-auto whitespace-pre-wrap leading-relaxed">
          {buildYaml(spec)}
        </pre>
      )}

      {/* Popup */}
      {popup && (
        <PreviewPopup
          label={popup.label}
          content={popup.content}
          onClose={() => setPopup(null)}
          onSave={(value) => {
            const keyMap: Record<string, keyof AgentSpec> = {
              Description: "description", Role: "role",
              Instructions: "instructions", Enforcement: "enforcement",
            };
            const k = keyMap[popup.label];
            if (k) set(k, value as AgentSpec[typeof k]);
            setPopup({ ...popup, content: value });
          }}
        />
      )}
    </div>
  );
}

// ── Interfaces Editor ─────────────────────────────────────────────────────────
function InterfacesEditor({ interfaces, onChange }: { interfaces: AgentInterface[]; onChange: (v: AgentInterface[]) => void }) {
  function add() {
    onChange([...interfaces, { type: "webchat" }]);
  }
  function update(i: number, patch: Partial<AgentInterface>) {
    const next = [...interfaces];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) { onChange(interfaces.filter((_, idx) => idx !== i)); }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Interfaces</p>
          <p className="text-xs text-slate-500 mt-0.5">How users or systems interact with this agent</p>
        </div>
        <button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-700 hover:bg-violet-600 text-white transition-colors">
          <Plus size={13} /> Add Interface
        </button>
      </div>

      {interfaces.length === 0 && (
        <div className="glass rounded-xl px-4 py-8 text-center text-slate-500 text-sm">
          No interfaces defined. Add one to specify how this agent is accessed.
        </div>
      )}

      {interfaces.map((iface, i) => (
        <div key={i} className="glass rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-wide">Interface {i + 1}</span>
            </div>
            <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldBlock label="Type">
              <select value={iface.type} onChange={(e) => update(i, { type: e.target.value as AgentInterface["type"] })} className="field-input">
                <option value="webchat">webchat</option>
                <option value="consolechat">consolechat</option>
                <option value="webhook">webhook</option>
              </select>
            </FieldBlock>
            {iface.type === "webhook" && (
              <>
                <FieldBlock label="Prompt Template" hint="Use ${http:payload.x} for payload vars">
                  <input value={iface.prompt ?? ""} onChange={(e) => update(i, { prompt: e.target.value })}
                    placeholder="Analyze ${http:payload.pull_request.url}" className="field-input" />
                </FieldBlock>
                <FieldBlock label="HTTP Exposure Path">
                  <input value={iface.exposure?.http?.path ?? ""} onChange={(e) => update(i, { exposure: { http: { path: e.target.value } } })}
                    placeholder="/my-webhook" className="field-input" />
                </FieldBlock>
                <FieldBlock label="Subscription Protocol">
                  <input value={iface.subscription?.protocol ?? ""} onChange={(e) => update(i, { subscription: { ...iface.subscription, protocol: e.target.value, callback: iface.subscription?.callback ?? "", secret: iface.subscription?.secret } })}
                    placeholder="websub" className="field-input" />
                </FieldBlock>
                <FieldBlock label="Callback URL">
                  <input value={iface.subscription?.callback ?? ""} onChange={(e) => update(i, { subscription: { ...iface.subscription, protocol: iface.subscription?.protocol ?? "", callback: e.target.value, secret: iface.subscription?.secret } })}
                    placeholder="${env:CALLBACK_URL}/path" className="field-input" />
                </FieldBlock>
                <FieldBlock label="Webhook Secret">
                  <input value={iface.subscription?.secret ?? ""} onChange={(e) => update(i, { subscription: { ...iface.subscription, protocol: iface.subscription?.protocol ?? "", callback: iface.subscription?.callback ?? "", secret: e.target.value } })}
                    placeholder="${env:WEBHOOK_SECRET}" className="field-input" />
                </FieldBlock>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tools Editor ──────────────────────────────────────────────────────────────
function ToolsEditor({ tools, onChange }: { tools: AgentTool[]; onChange: (v: AgentTool[]) => void }) {
  function add() {
    onChange([...tools, { name: "", transport: { type: "http", url: "" } }]);
  }
  function update(i: number, patch: Partial<AgentTool>) {
    const next = [...tools];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) { onChange(tools.filter((_, idx) => idx !== i)); }

  function updateTransport(i: number, patch: Partial<AgentTool["transport"]>) {
    update(i, { transport: { ...tools[i].transport, ...patch } });
  }
  function updateToolAuth(i: number, patch: Partial<NonNullable<AgentTool["authentication"]>>) {
    update(i, { authentication: { type: "none", ...tools[i].authentication, ...patch } });
  }
  function updateEnv(i: number, key: string, value: string) {
    update(i, { env: { ...tools[i].env, [key]: value } });
  }
  function removeEnv(i: number, key: string) {
    const env = { ...tools[i].env };
    delete env[key];
    update(i, { env });
  }
  function updateAllowList(i: number, raw: string) {
    update(i, { tool_filter: { allow: raw.split("\n").map((s) => s.trim()).filter(Boolean) } });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">MCP Tools</p>
          <p className="text-xs text-slate-500 mt-0.5">External tools your agent can call via MCP</p>
        </div>
        <button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-700 hover:bg-violet-600 text-white transition-colors">
          <Plus size={13} /> Add Tool
        </button>
      </div>

      {tools.length === 0 && (
        <div className="glass rounded-xl px-4 py-8 text-center text-slate-500 text-sm">
          No tools added yet. Tools let your agent call external services.
        </div>
      )}

      {tools.map((tool, i) => (
        <div key={i} className="glass rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-violet-400 uppercase tracking-wide">{tool.name || `Tool ${i + 1}`}</span>
            <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldBlock label="Tool Name">
              <input value={tool.name} onChange={(e) => update(i, { name: e.target.value })}
                placeholder="github" className="field-input" />
            </FieldBlock>
            <FieldBlock label="Transport Type">
              <select value={tool.transport.type} onChange={(e) => updateTransport(i, { type: e.target.value as "http" | "stdio", url: "", command: "", args: [] })} className="field-input">
                <option value="http">HTTP</option>
                <option value="stdio">stdio</option>
              </select>
            </FieldBlock>

            {tool.transport.type === "http" && (
              <FieldBlock label="URL" className="md:col-span-2">
                <input value={tool.transport.url ?? ""} onChange={(e) => updateTransport(i, { url: e.target.value })}
                  placeholder="https://api.example.com/mcp/" className="field-input" />
              </FieldBlock>
            )}

            {tool.transport.type === "stdio" && (
              <>
                <FieldBlock label="Command">
                  <input value={tool.transport.command ?? ""} onChange={(e) => updateTransport(i, { command: e.target.value })}
                    placeholder="npx or uvx" className="field-input" />
                </FieldBlock>
                <FieldBlock label="Args" hint="One per line">
                  <textarea value={(tool.transport.args ?? []).join("\n")} onChange={(e) => updateTransport(i, { args: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                    rows={3} placeholder={"-y\n@modelcontextprotocol/server-fetch"} className="field-input resize-none text-xs" />
                </FieldBlock>
              </>
            )}

            {/* Tool Authentication */}
            <FieldBlock label="Auth Type">
              <select value={tool.authentication?.type ?? "none"} onChange={(e) => updateToolAuth(i, { type: e.target.value as NonNullable<AgentTool["authentication"]>["type"] })} className="field-input">
                <option value="none">None</option>
                <option value="api-key">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic (username/password)</option>
              </select>
            </FieldBlock>

            {tool.authentication?.type === "bearer" && (
              <FieldBlock label="Token">
                <input value={tool.authentication.token ?? ""} onChange={(e) => updateToolAuth(i, { token: e.target.value })}
                  placeholder="${env:TOKEN}" className="field-input" />
              </FieldBlock>
            )}
            {tool.authentication?.type === "api-key" && (
              <FieldBlock label="API Key">
                <input value={tool.authentication.api_key ?? ""} onChange={(e) => updateToolAuth(i, { api_key: e.target.value })}
                  placeholder="${env:API_KEY}" className="field-input" />
              </FieldBlock>
            )}
            {tool.authentication?.type === "basic" && (
              <>
                <FieldBlock label="Username">
                  <input value={tool.authentication.username ?? ""} onChange={(e) => updateToolAuth(i, { username: e.target.value })}
                    placeholder="${env:USERNAME}" className="field-input" />
                </FieldBlock>
                <FieldBlock label="Password">
                  <input value={tool.authentication.password ?? ""} onChange={(e) => updateToolAuth(i, { password: e.target.value })}
                    placeholder="${env:PASSWORD}" className="field-input" />
                </FieldBlock>
              </>
            )}

            {/* Tool Filter */}
            <FieldBlock label="Allowed Tools" hint="One per line — leave empty to allow all" className="md:col-span-2">
              <textarea value={(tool.tool_filter?.allow ?? []).join("\n")} onChange={(e) => updateAllowList(i, e.target.value)}
                rows={3} placeholder={"get_file_contents\npull_request_read\npull_request_review_write"} className="field-input resize-none text-xs" />
            </FieldBlock>

            {/* Query Params */}
            <QueryParamsEditor
              className="md:col-span-2"
              params={tool.query_params ?? []}
              onChange={(params) => update(i, { query_params: params })}
            />

          </div>
        </div>
      ))}
    </div>
  );
}

// ── Query Params Editor ───────────────────────────────────────────────────────
function QueryParamsEditor({ params, className, onChange }: {
  params: QueryParam[];
  className?: string;
  onChange: (p: QueryParam[]) => void;
}) {
  function add() { onChange([...params, { key: "", description: "", required: false, default: "" }]); }
  function update(i: number, patch: Partial<QueryParam>) {
    const next = [...params]; next[i] = { ...next[i], ...patch }; onChange(next);
  }
  function remove(i: number) { onChange(params.filter((_, idx) => idx !== i)); }

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Query Params
          <span className="text-slate-600 normal-case font-normal ml-1">— values collected at test time</span>
        </p>
        <button onClick={add} className="text-xs text-slate-500 hover:text-violet-400 transition-colors flex items-center gap-1">
          <Plus size={11} /> Add
        </button>
      </div>
      {params.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-2 text-xs text-slate-600 px-1">
            <span>Key</span><span>Description / hint</span><span>Req</span><span></span>
          </div>
          {params.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-2 items-center">
              <input value={p.key} onChange={(e) => update(i, { key: e.target.value })}
                placeholder="e.g. location" className="field-input text-xs py-1" />
              <input value={p.description} onChange={(e) => update(i, { description: e.target.value })}
                placeholder="e.g. City name" className="field-input text-xs py-1" />
              <input type="checkbox" checked={p.required} onChange={(e) => update(i, { required: e.target.checked })}
                className="accent-violet-500 w-4 h-4 cursor-pointer" />
              <button onClick={() => remove(i)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Skills Editor ─────────────────────────────────────────────────────────────
function SkillsEditor({ skills, onChange }: { skills: AgentSkill[]; onChange: (v: AgentSkill[]) => void }) {
  function add(type: AgentSkill["type"]) {
    onChange([...skills, type === "local" ? { type: "local", path: "./skills" } : { type: "remote", url: "" }]);
  }
  function update(i: number, patch: Partial<AgentSkill>) {
    const next = [...skills]; next[i] = { ...next[i], ...patch }; onChange(next);
  }
  function remove(i: number) { onChange(skills.filter((_, idx) => idx !== i)); }

  return (
    <div className="md:col-span-2 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Skills</p>
          <p className="text-xs text-slate-500 mt-0.5">Reusable skill modules this agent can activate</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => add("local")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <Plus size={12} /> Local
          </button>
          <button
            onClick={() => add("remote")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <Plus size={12} /> Remote
          </button>
        </div>
      </div>

      {/* Empty state */}
      {skills.length === 0 && (
        <div className="glass rounded-xl px-4 py-5 text-center text-slate-500 text-xs">
          No skills added. Use <span className="text-slate-400">Local</span> for a folder path or <span className="text-slate-400">Remote</span> for a URL.
        </div>
      )}

      {/* Skill cards */}
      {skills.map((skill, i) => (
        <div key={i} className="glass rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                skill.type === "local"
                  ? "text-emerald-400 bg-emerald-900/30 border-emerald-700/40"
                  : "text-sky-400 bg-sky-900/30 border-sky-700/40"
              }`}>
                {skill.type}
              </span>
              <span className="text-xs text-slate-400 truncate max-w-48">
                {skill.type === "local" ? (skill.path || "no path set") : (skill.url || "no url set")}
              </span>
            </div>
            <button onClick={() => remove(i)} className="text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldBlock label="Type">
              <select
                value={skill.type}
                onChange={(e) => update(i, { type: e.target.value as AgentSkill["type"], path: undefined, url: undefined })}
                className="field-input"
              >
                <option value="local">local — folder on disk</option>
                <option value="remote">remote — URL endpoint</option>
              </select>
            </FieldBlock>

            {skill.type === "local" ? (
              <FieldBlock label="Path" hint="Relative to agent file">
                <input
                  value={skill.path ?? ""}
                  onChange={(e) => update(i, { path: e.target.value })}
                  placeholder="./skills"
                  className="field-input"
                />
              </FieldBlock>
            ) : (
              <FieldBlock label="URL">
                <input
                  value={skill.url ?? ""}
                  onChange={(e) => update(i, { url: e.target.value })}
                  placeholder="https://skills.example.com"
                  className="field-input"
                />
              </FieldBlock>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── YAML builder ──────────────────────────────────────────────────────────────
function buildYaml(spec: AgentSpec): string {
  const lines: string[] = ["---"];

  if (spec.spec_version) lines.push(`spec_version: "${spec.spec_version}"`);
  lines.push(`name: "${spec.name}"`);

  // description — block scalar if multiline
  if (spec.description.includes("\n")) {
    lines.push("description: >"); spec.description.trim().split("\n").forEach((l) => lines.push(`  ${l}`));
  } else {
    lines.push(`description: "${spec.description}"`);
  }

  lines.push(`version: "${spec.version}"`);
  if (spec.license) lines.push(`license: "${spec.license}"`);
  if (spec.author) lines.push(`author: "${spec.author}"`);
  if (spec.provider.name || spec.provider.url) {
    lines.push("provider:");
    if (spec.provider.name) lines.push(`  name: "${spec.provider.name}"`);
    if (spec.provider.url) lines.push(`  url: "${spec.provider.url}"`);
  }

  lines.push(`max_iterations: ${spec.max_iterations}`);

  // model
  lines.push("model:");
  lines.push(`  name: "${spec.model.name}"`);
  lines.push(`  provider: "${spec.model.provider}"`);
  if (spec.model.base_url) lines.push(`  base_url: "${spec.model.base_url}"`);
  if (spec.model.authentication.type !== "none") {
    lines.push("  authentication:");
    lines.push(`    type: "${spec.model.authentication.type}"`);
    lines.push(`    api_key: "${spec.model.authentication.api_key}"`);
  }

  // interfaces
  if (spec.interfaces.length > 0) {
    lines.push("interfaces:");
    for (const iface of spec.interfaces) {
      lines.push(`- type: "${iface.type}"`);
      if (iface.prompt) {
        lines.push("  prompt: >"); iface.prompt.split("\n").forEach((l) => lines.push(`    ${l}`));
      }
      if (iface.exposure?.http?.path) {
        lines.push("  exposure:"); lines.push("    http:"); lines.push(`      path: "${iface.exposure.http.path}"`);
      }
      if (iface.subscription) {
        lines.push("  subscription:");
        lines.push(`    protocol: "${iface.subscription.protocol}"`);
        lines.push(`    callback: "${iface.subscription.callback}"`);
        if (iface.subscription.secret) lines.push(`    secret: "${iface.subscription.secret}"`);
      }
    }
  }

  // tools
  if (spec.tools.length > 0) {
    lines.push("tools:");
    lines.push("  mcp:");
    for (const tool of spec.tools) {
      lines.push(`  - name: "${tool.name}"`);
      lines.push("    transport:");
      lines.push(`      type: "${tool.transport.type}"`);
      if (tool.transport.type === "http" && tool.transport.url) {
        // Build full URL with query_params appended as {KEY} placeholders
        let fullUrl = tool.transport.url;
        if (tool.query_params && tool.query_params.length > 0) {
          const qs = tool.query_params
            .map((p) => `${p.key}={${p.key.toUpperCase()}}`)
            .join("&");
          fullUrl = fullUrl.endsWith("?") || fullUrl.includes("?")
            ? `${fullUrl.replace(/\?$/, "")}?${qs}`
            : `${fullUrl}?${qs}`;
        }
        lines.push(`      url: "${fullUrl}"`);
      }
      if (tool.transport.type === "stdio") {
        if (tool.transport.command) lines.push(`      command: "${tool.transport.command}"`);
        if (tool.transport.args && tool.transport.args.length > 0) {
          lines.push("      args:");
          tool.transport.args.forEach((a) => lines.push(`      - "${a}"`));
        }
      }
      if (tool.authentication && tool.authentication.type !== "none") {
        lines.push("    authentication:");
        lines.push(`      type: "${tool.authentication.type}"`);
        if (tool.authentication.token) lines.push(`      token: "${tool.authentication.token}"`);
        if (tool.authentication.api_key) lines.push(`      api_key: "${tool.authentication.api_key}"`);
        if (tool.authentication.username) lines.push(`      username: "${tool.authentication.username}"`);
        if (tool.authentication.password) lines.push(`      password: "${tool.authentication.password}"`);
      }
      if (tool.env && Object.keys(tool.env).length > 0) {
        lines.push("    env:");
        Object.entries(tool.env).forEach(([k, v]) => lines.push(`      ${k}: "${v}"`));
      }
      if (tool.tool_filter && tool.tool_filter.allow.length > 0) {
        lines.push("    tool_filter:");
        lines.push("      allow:");
        tool.tool_filter.allow.forEach((a) => lines.push(`      - "${a}"`));
      }
      if (tool.query_params && tool.query_params.length > 0) {
        lines.push("    query_params:");
        tool.query_params.forEach((p) => {
          lines.push(`    - key: "${p.key}"`);
          if (p.description) lines.push(`      description: "${p.description}"`);
          lines.push(`      required: ${p.required}`);
          if (p.default) lines.push(`      default: "${p.default}"`);
        });
      }
    }
  }

  // skills
  if (spec.skills.length > 0) {
    lines.push("skills:");
    for (const skill of spec.skills) {
      lines.push(`- type: "${skill.type}"`);
      if (skill.path) lines.push(`  path: "${skill.path}"`);
      if (skill.url) lines.push(`  url: "${skill.url}"`);
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("# Role");
  lines.push("");
  lines.push(spec.role || "");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("# Instructions");
  lines.push("");
  lines.push(spec.instructions || "");

  // output schema
  if (spec.output_format === "json" && spec.json_output_template?.trim()) {
    lines.push(""); lines.push("---"); lines.push(""); lines.push("# Output Schema"); lines.push("");
    lines.push("```json"); lines.push(spec.json_output_template.trim()); lines.push("```");
  } else if (spec.output_format !== "json" && (spec.output_schema_fields?.length ?? 0) > 0) {
    lines.push(""); lines.push("---"); lines.push(""); lines.push("# Output Schema"); lines.push("");
    (spec.output_schema_fields ?? []).forEach((f) =>
      lines.push(`- **${f.key}** (${f.type}${f.required ? ", required" : ""}): ${f.description}`)
    );
  }

  if (spec.enforcement) {
    lines.push(""); lines.push("---"); lines.push(""); lines.push("# Enforcement"); lines.push("");
    lines.push(spec.enforcement);
  }

  return lines.join("\n");
}
