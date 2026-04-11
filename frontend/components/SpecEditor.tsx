"use client";
import { useState } from "react";
import type { AgentSpec, AgentTool } from "@/lib/types";
import FieldBlock from "./FieldBlock";
import { Plus, Trash2, Download, Code2, Play } from "lucide-react";
import clsx from "clsx";

interface Props {
  spec: AgentSpec;
  onChange: (s: AgentSpec) => void;
}

type Tab = "core" | "model" | "tools" | "schema" | "preview";

export default function SpecEditor({ spec, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("core");

  function set<K extends keyof AgentSpec>(key: K, value: AgentSpec[K]) {
    onChange({ ...spec, [key]: value });
  }

  function setModel(key: keyof AgentSpec["model"], value: string | number) {
    onChange({ ...spec, model: { ...spec.model, [key]: value } });
  }

  function addTool() {
    set("tools", [...spec.tools, { name: "", description: "" }]);
  }

  function updateTool(i: number, t: AgentTool) {
    const tools = [...spec.tools];
    tools[i] = t;
    set("tools", tools);
  }

  function removeTool(i: number) {
    set("tools", spec.tools.filter((_, idx) => idx !== i));
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
    { id: "tools", label: "Tools" },
    { id: "schema", label: "Schema" },
    { id: "preview", label: "Preview" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "px-4 py-2 text-sm rounded-t-lg transition-colors -mb-px border-b-2",
              tab === t.id
                ? "text-violet-400 border-violet-500"
                : "text-slate-400 border-transparent hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2 pb-2">
          <button
            onClick={downloadSpec}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <Download size={13} /> Export .md
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <Code2 size={13} /> Generate Code
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-700 hover:bg-violet-600 text-white transition-colors">
            <Play size={13} /> Test Agent
          </button>
        </div>
      </div>

      {/* Core tab */}
      {tab === "core" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldBlock label="Agent Name" hint="Short, descriptive name">
            <input
              value={spec.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Code Performance Reviewer"
              className="field-input"
            />
          </FieldBlock>
          <FieldBlock label="Version">
            <input
              value={spec.version}
              onChange={(e) => set("version", e.target.value)}
              placeholder="0.1.0"
              className="field-input"
            />
          </FieldBlock>
          <FieldBlock label="Description" className="md:col-span-2">
            <textarea
              value={spec.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="What does this agent do?"
              className="field-input resize-none"
            />
          </FieldBlock>
          <FieldBlock label="Role" className="md:col-span-2">
            <textarea
              value={spec.role}
              onChange={(e) => set("role", e.target.value)}
              rows={2}
              placeholder="You are an AI agent that..."
              className="field-input resize-none"
            />
          </FieldBlock>
          <FieldBlock label="Instructions" className="md:col-span-2">
            <textarea
              value={spec.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              rows={5}
              placeholder="Step-by-step instructions for the agent..."
              className="field-input resize-none"
            />
          </FieldBlock>
          <FieldBlock label="Output Format">
            <select
              value={spec.output_format}
              onChange={(e) => set("output_format", e.target.value)}
              className="field-input"
            >
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
              <option value="plain">Plain Text</option>
              <option value="html">HTML</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Execution Mode">
            <select
              value={spec.execution_mode}
              onChange={(e) => set("execution_mode", e.target.value as AgentSpec["execution_mode"])}
              className="field-input"
            >
              <option value="sequential">Sequential</option>
              <option value="agentic">Agentic (loop)</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Max Iterations">
            <input
              type="number"
              min={1}
              max={50}
              value={spec.max_iterations}
              onChange={(e) => set("max_iterations", Number(e.target.value))}
              className="field-input"
            />
          </FieldBlock>
          <FieldBlock label="Memory Type">
            <select
              value={spec.memory.type}
              onChange={(e) => onChange({ ...spec, memory: { type: e.target.value as AgentSpec["memory"]["type"] } })}
              className="field-input"
            >
              <option value="none">None</option>
              <option value="short-term">Short-term</option>
              <option value="long-term">Long-term</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Enforcement" className="md:col-span-2">
            <textarea
              value={spec.enforcement}
              onChange={(e) => set("enforcement", e.target.value)}
              rows={2}
              placeholder="Rules the agent must always follow..."
              className="field-input resize-none"
            />
          </FieldBlock>
        </div>
      )}

      {/* Model tab */}
      {tab === "model" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldBlock label="Provider">
            <select
              value={spec.model.provider}
              onChange={(e) => setModel("provider", e.target.value)}
              className="field-input"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Model Name">
            <input
              value={spec.model.name}
              onChange={(e) => setModel("name", e.target.value)}
              placeholder="gpt-4o"
              className="field-input"
            />
          </FieldBlock>
          <FieldBlock label="Temperature" hint="0 = deterministic, 1 = creative">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={spec.model.temperature}
              onChange={(e) => setModel("temperature", Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <span className="text-xs text-slate-400 mt-1 block">{spec.model.temperature}</span>
          </FieldBlock>
        </div>
      )}

      {/* Tools tab */}
      {tab === "tools" && (
        <div className="flex flex-col gap-3">
          {spec.tools.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">
              No tools added yet. Tools let your agent interact with the world.
            </p>
          )}
          {spec.tools.map((tool, i) => (
            <div key={i} className="glass rounded-xl p-4 flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  value={tool.name}
                  onChange={(e) => updateTool(i, { ...tool, name: e.target.value })}
                  placeholder="Tool name (e.g. web_search)"
                  className="field-input"
                />
                <input
                  value={tool.description ?? ""}
                  onChange={(e) => updateTool(i, { ...tool, description: e.target.value })}
                  placeholder="What does it do?"
                  className="field-input"
                />
              </div>
              <button onClick={() => removeTool(i)} className="text-slate-500 hover:text-red-400 mt-2 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            onClick={addTool}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-violet-500 text-sm transition-colors"
          >
            <Plus size={15} /> Add Tool
          </button>
        </div>
      )}

      {/* Schema tab */}
      {tab === "schema" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SchemaEditor
            label="Input Schema"
            schema={spec.input_schema}
            onChange={(s) => set("input_schema", s)}
          />
          <SchemaEditor
            label="Output Schema"
            schema={spec.output_schema}
            onChange={(s) => set("output_schema", s)}
          />
        </div>
      )}

      {/* Preview tab */}
      {tab === "preview" && (
        <pre className="glass rounded-xl p-5 text-xs text-slate-300 overflow-auto whitespace-pre-wrap leading-relaxed">
          {buildYaml(spec)}
        </pre>
      )}
    </div>
  );
}

// Simple schema key-value editor
function SchemaEditor({
  label,
  schema,
  onChange,
}: {
  label: string;
  schema: Record<string, string>;
  onChange: (s: Record<string, string>) => void;
}) {
  function addField() {
    onChange({ ...schema, "": "string" });
  }

  function updateKey(oldKey: string, newKey: string) {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(schema)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  }

  function updateType(key: string, type: string) {
    onChange({ ...schema, [key]: type });
  }

  function removeField(key: string) {
    const next = { ...schema };
    delete next[key];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-slate-300">{label}</p>
      {Object.entries(schema).map(([key, type]) => (
        <div key={key} className="flex gap-2 items-center">
          <input
            value={key}
            onChange={(e) => updateKey(key, e.target.value)}
            placeholder="field_name"
            className="field-input flex-1"
          />
          <select
            value={type}
            onChange={(e) => updateType(key, e.target.value)}
            className="field-input w-28"
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="array">array</option>
            <option value="object">object</option>
          </select>
          <button onClick={() => removeField(key)} className="text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={addField}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-violet-500 text-xs transition-colors"
      >
        <Plus size={13} /> Add Field
      </button>
    </div>
  );
}

function buildYaml(spec: AgentSpec): string {
  return `---
spec_version: "${spec.spec_version}"
name: "${spec.name}"
description: "${spec.description}"
version: "${spec.version}"

model:
  provider: "${spec.model.provider}"
  name: "${spec.model.name}"
  temperature: ${spec.model.temperature}

max_iterations: ${spec.max_iterations}
execution_mode: "${spec.execution_mode}"

memory:
  type: "${spec.memory.type}"

tools:
${spec.tools.length ? spec.tools.map((t) => `  - name: "${t.name}"\n    description: "${t.description ?? ""}"`).join("\n") : "  []"}

input_schema:
${Object.entries(spec.input_schema).length ? Object.entries(spec.input_schema).map(([k, v]) => `  ${k}: ${v}`).join("\n") : "  {}"}

output_schema:
${Object.entries(spec.output_schema).length ? Object.entries(spec.output_schema).map(([k, v]) => `  ${k}: ${v}`).join("\n") : "  {}"}
---

## Role

${spec.role}

## Instructions

${spec.instructions}

## Output Format

${spec.output_format}

## Enforcement

${spec.enforcement}
`;
}
