"use client";
import { useState } from "react";
import { Book, Zap, Lightbulb, Wrench, Play, FileText, Settings, Code, Database, Globe } from "lucide-react";
import clsx from "clsx";

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: { id: string; label: string; icon: React.ReactNode }[];
}

const sections: DocSection[] = [
  {
    id: "get-started",
    title: "GET STARTED",
    icon: <Zap size={16} />,
    items: [
      { id: "intro", label: "What is AgentFactory?", icon: <Book size={14} /> },
      { id: "quickstart", label: "Quickstart", icon: <Zap size={14} /> },
      { id: "concepts", label: "Core Concepts", icon: <Lightbulb size={14} /> },
      { id: "spec-format", label: "The .md Spec Format", icon: <FileText size={14} /> },
    ],
  },
  {
    id: "builder",
    title: "BUILDER",
    icon: <Wrench size={16} />,
    items: [
      { id: "core-tab", label: "Core Tab", icon: <Settings size={14} /> },
      { id: "model-tab", label: "Model Tab", icon: <Code size={14} /> },
      { id: "interfaces-tab", label: "Interfaces Tab", icon: <Globe size={14} /> },
      { id: "tools-tab", label: "Tools Tab", icon: <Wrench size={14} /> },
      { id: "preview-export", label: "Preview & Export", icon: <FileText size={14} /> },
    ],
  },
  {
    id: "testing",
    title: "TESTING",
    icon: <Play size={16} />,
    items: [
      { id: "test-agent", label: "Test Agent Panel", icon: <Play size={14} /> },
      { id: "query-params", label: "Query Param Extraction", icon: <Database size={14} /> },
    ],
  },
];

const content: Record<string, { title: string; body: React.ReactNode }> = {
  intro: {
    title: "What is AgentFactory?",
    body: (
      <>
        <p>AgentFactory is a no-code platform for building AI agents using a structured Markdown specification format.</p>
        <p className="mt-3">Instead of writing code or wrestling with YAML configs, you fill in a visual form and get a clean, portable agent spec file that any compatible runtime can execute.</p>
        <div className="mt-5 glass rounded-xl p-4">
          <p className="text-xs text-violet-400 font-medium mb-2">Key Benefits</p>
          <ul className="text-sm text-slate-300 space-y-1.5 list-disc list-inside">
            <li>No coding required — visual form-based builder</li>
            <li>Portable `.md` spec files — version control friendly</li>
            <li>AI-powered spec generation from your idea</li>
            <li>Test agents live before deploying</li>
          </ul>
        </div>
      </>
    ),
  },
  quickstart: {
    title: "Quickstart",
    body: (
      <>
        <p className="text-sm text-slate-300 mb-4">Get your first agent running in 3 steps:</p>
        <div className="space-y-3">
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-violet-400 font-medium mb-1">1. Describe your idea</p>
            <p className="text-sm text-slate-300">Type what you want your agent to do on the landing page. Example: <span className="italic">"An AI that reviews code for security issues"</span></p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-violet-400 font-medium mb-1">2. Answer clarification questions</p>
            <p className="text-sm text-slate-300">The AI asks 3 targeted questions to refine your spec. Answer what you can or skip.</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-violet-400 font-medium mb-1">3. Review & export</p>
            <p className="text-sm text-slate-300">The builder pre-fills all fields. Edit anything you want, then click Export .md to download your agent spec.</p>
          </div>
        </div>
      </>
    ),
  },
  concepts: {
    title: "Core Concepts",
    body: (
      <>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-white mb-1">Agent Spec</p>
            <p className="text-sm text-slate-400">A structured Markdown file containing all the metadata, instructions, and configuration needed to run an AI agent.</p>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">Role</p>
            <p className="text-sm text-slate-400">The agent's persona and expertise — defines who the agent is and what it knows.</p>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">Instructions</p>
            <p className="text-sm text-slate-400">Step-by-step behavior rules the agent follows when processing requests.</p>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">Tools</p>
            <p className="text-sm text-slate-400">External services the agent can call via MCP (Model Context Protocol) — like web search, file access, or APIs.</p>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">Interfaces</p>
            <p className="text-sm text-slate-400">How users interact with the agent: webchat (browser), consolechat (terminal), or webhook (event-driven).</p>
          </div>
        </div>
      </>
    ),
  },
  "spec-format": {
    title: "The .md Spec Format",
    body: (
      <>
        <p className="text-sm text-slate-300 mb-3">Agent specs are Markdown files with YAML frontmatter:</p>
        <pre className="glass rounded-xl p-4 text-xs text-slate-300 overflow-auto font-mono leading-relaxed">
{`---
name: "My Agent"
model:
  provider: "groq"
  name: "llama-3.3-70b-versatile"
---

# Role
You are a helpful agent...

# Instructions
1. Step one
2. Step two`}
        </pre>
        <p className="text-sm text-slate-400 mt-3">The frontmatter contains metadata and config. The body contains role, instructions, and enforcement rules.</p>
      </>
    ),
  },
  "core-tab": {
    title: "Core Tab",
    body: (
      <>
        <p className="text-sm text-slate-300 mb-3">The Core tab defines your agent's identity and behavior:</p>
        <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
          <li><span className="text-white font-medium">Name, Version, License</span> — basic metadata</li>
          <li><span className="text-white font-medium">Description</span> — one-sentence summary</li>
          <li><span className="text-white font-medium">Role</span> — the agent's persona (click the eye icon for full-screen edit)</li>
          <li><span className="text-white font-medium">Instructions</span> — step-by-step behavior rules</li>
          <li><span className="text-white font-medium">Output Schema</span> — for JSON format, define the exact structure the agent returns</li>
          <li><span className="text-white font-medium">Enforcement</span> — hard rules the agent must always follow</li>
        </ul>
      </>
    ),
  },
  "model-tab": {
    title: "Model Tab",
    body: (
      <>
        <p className="text-sm text-slate-300 mb-3">Configure the LLM powering your agent:</p>
        <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
          <li><span className="text-white font-medium">Provider</span> — OpenAI, Anthropic, Groq, or Ollama</li>
          <li><span className="text-white font-medium">Model Name</span> — e.g. gpt-4o, claude-sonnet-4-6</li>
          <li><span className="text-white font-medium">Base URL</span> — override the API endpoint (optional)</li>
          <li><span className="text-white font-medium">API Key</span> — use <code className="text-violet-300">${`\${env:VAR_NAME}`}</code> for environment variables</li>
          <li><span className="text-white font-medium">Temperature</span> — 0 = deterministic, 1 = creative</li>
        </ul>
      </>
    ),
  },
  "interfaces-tab": {
    title: "Interfaces Tab",
    body: (
      <>
        <p className="text-sm text-slate-300 mb-3">Define how users or systems interact with your agent:</p>
        <div className="space-y-3">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-emerald-400 font-medium mb-1">webchat</p>
            <p className="text-xs text-slate-400">Browser-based chat UI — real-time WebSocket connection</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-sky-400 font-medium mb-1">consolechat</p>
            <p className="text-xs text-slate-400">Terminal / CLI interaction — stdin/stdout</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-amber-400 font-medium mb-1">webhook</p>
            <p className="text-xs text-slate-400">Event-driven HTTP trigger — e.g. GitHub PR events. Supports prompt templates with <code className="text-violet-300">${`\${http:payload.field}`}</code> interpolation.</p>
          </div>
        </div>
      </>
    ),
  },
  "tools-tab": {
    title: "Tools Tab",
    body: (
      <>
        <p className="text-sm text-slate-300 mb-3">Add MCP tools your agent can call:</p>
        <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
          <li><span className="text-white font-medium">Transport</span> — HTTP (URL) or stdio (command + args)</li>
          <li><span className="text-white font-medium">Authentication</span> — api-key, bearer, basic, or none</li>
          <li><span className="text-white font-medium">Query Params</span> — define params the LLM extracts from chat (e.g. city name, search term)</li>
          <li><span className="text-white font-medium">Allowed Tools</span> — allowlist specific tool names (leave empty = allow all)</li>
        </ul>
        <div className="mt-4 glass rounded-xl p-3">
          <p className="text-xs text-violet-400 font-medium mb-1">💡 Query Param Extraction</p>
          <p className="text-xs text-slate-400">When a user says "weather in Colombo", the LLM automatically extracts <code className="text-violet-300">city=Colombo</code> and appends it to the tool URL.</p>
        </div>
      </>
    ),
  },
  "preview-export": {
    title: "Preview & Export",
    body: (
      <>
        <p className="text-sm text-slate-300 mb-3">The Preview tab shows the complete `.md` spec in real time.</p>
        <p className="text-sm text-slate-400 mb-3">Click <span className="text-white font-medium">Export .md</span> to download the spec as a portable Markdown file.</p>
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-violet-400 font-medium mb-1">What happens next?</p>
          <p className="text-xs text-slate-400">The exported `.md` file can be run by the AgentFactory backend or any compatible agent runtime that parses the spec format.</p>
        </div>
      </>
    ),
  },
  "test-agent": {
    title: "Test Agent Panel",
    body: (
      <>
        <p className="text-sm text-slate-300 mb-3">Click <span className="text-white font-medium">Test Agent</span> to open a live chat panel and test your agent before exporting.</p>
        <div className="space-y-3">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-violet-400 font-medium mb-1">Step 1 — Groq Notice</p>
            <p className="text-xs text-slate-400">The testing environment uses Groq only (llama-3.3-70b-versatile). Your configured model is temporarily overridden.</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-violet-400 font-medium mb-1">Step 2 — Tool Credentials</p>
            <p className="text-xs text-slate-400">If your agent uses tools with authentication, you'll be asked for API keys. Keys are stored in memory only and wiped when you close the panel.</p>
          </div>
        </div>
      </>
    ),
  },
  "query-params": {
    title: "Query Param Extraction",
    body: (
      <>
        <p className="text-sm text-slate-300 mb-3">Query param values are extracted automatically from your chat messages by the LLM.</p>
        <div className="glass rounded-xl p-4 mb-4">
          <p className="text-xs text-emerald-400 font-medium mb-2">Example</p>
          <p className="text-xs text-slate-300 mb-1">You type: <span className="italic">"Get weather in Colombo"</span></p>
          <p className="text-xs text-slate-500">→ LLM extracts: <code className="text-violet-300">city=Colombo</code></p>
          <p className="text-xs text-slate-500">→ Backend calls: <code className="text-violet-300">api.weather.com?city=Colombo</code></p>
        </div>
        <p className="text-sm text-slate-400 mb-2">You can also choose <span className="text-white font-medium">manual mode</span> in the credentials step to enter param values directly before testing.</p>
      </>
    ),
  },
};

export default function DocsPage() {
  const [activeId, setActiveId] = useState("intro");

  const activeContent = content[activeId] || content.intro;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950/50 p-6 overflow-y-auto">
        <div className="flex items-center gap-2 mb-6">
          <Book size={18} className="text-violet-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Documentation</h2>
        </div>

        <nav className="space-y-6">
          {sections.map((section) => (
            <div key={section.id}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                {section.icon}
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveId(item.id)}
                      className={clsx(
                        "w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors",
                        activeId === item.id
                          ? "bg-violet-600/20 text-violet-300 border-l-2 border-violet-500 pl-2.5"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      )}
                    >
                      <span className="opacity-60">{item.icon}</span>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-white mb-6">{activeContent.title}</h1>
          <div className="text-sm text-slate-300 leading-relaxed space-y-3">
            {activeContent.body}
          </div>
        </div>
      </main>
    </div>
  );
}
