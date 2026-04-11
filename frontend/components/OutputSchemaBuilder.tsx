"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, CheckCircle, XCircle } from "lucide-react";
import type { OutputSchemaField, FieldType } from "@/lib/types";
import clsx from "clsx";

interface Props {
  format: string;
  fields: OutputSchemaField[];
  jsonTemplate: string;
  onChange: (fields: OutputSchemaField[]) => void;
  onJsonTemplateChange: (v: string) => void;
}

const FIELD_TYPES: FieldType[] = ["string", "number", "boolean", "array", "object"];

const JSON_PRESETS: { label: string; value: string }[] = [
  {
    label: "Issues List",
    value: JSON.stringify(
      {
        issues: [
          {
            line: "<1-based line number>",
            title: "<short issue title>",
            problem: "<what is wrong>",
            suggestion: "<how to fix it>",
            severity: "error | warning | info",
          },
        ],
      },
      null,
      2
    ),
  },
  {
    label: "Key-Value Result",
    value: JSON.stringify({ result: "<main result>", confidence: 0.95 }, null, 2),
  },
  {
    label: "Summary + Items",
    value: JSON.stringify(
      { summary: "<brief summary>", items: ["<item 1>", "<item 2>"], total: 0 },
      null,
      2
    ),
  },
  {
    label: "Empty (no issues)",
    value: JSON.stringify({ issues: [] }, null, 2),
  },
];

const TABLE_PRESETS: Record<string, { label: string; fields: OutputSchemaField[] }[]> = {
  markdown: [
    {
      label: "Report Sections",
      fields: [
        { key: "## Summary", type: "string", description: "High-level summary", required: true, enum: [] },
        { key: "## Findings", type: "array", description: "Detailed findings", required: true, enum: [] },
        { key: "## Recommendations", type: "array", description: "Action items", required: false, enum: [] },
      ],
    },
  ],
  html: [
    {
      label: "Structured Report",
      fields: [
        { key: "<h2>Summary</h2>", type: "string", description: "Summary section", required: true, enum: [] },
        { key: "<ul>items</ul>", type: "array", description: "List of items", required: true, enum: [] },
      ],
    },
  ],
  plain: [
    {
      label: "Numbered List",
      fields: [
        { key: "header", type: "string", description: "Opening line", required: true, enum: [] },
        { key: "items", type: "array", description: "Numbered items", required: true, enum: [] },
      ],
    },
  ],
};

function emptyField(): OutputSchemaField {
  return { key: "", type: "string", description: "", required: false, enum: [] };
}

// Syntax highlight JSON string into colored spans
function highlight(json: string): string {
  // Escape HTML special chars first so <placeholders> don't break rendering
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "text-violet-300";
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "text-sky-300" : "text-emerald-300";
      } else if (/true|false/.test(match)) {
        cls = "text-amber-300";
      } else if (/null/.test(match)) {
        cls = "text-slate-500";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// ── JSON free-form editor ────────────────────────────────────────────────────
function JsonOutputEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [raw, setRaw] = useState(value || "");
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // keep in sync if parent resets
  useEffect(() => {
    setRaw(value || "");
  }, [value]);

  function handleChange(v: string) {
    setRaw(v);
    // Strip placeholder tokens before validating so <...> values don't cause false errors
    const stripped = v.replace(/"<[^"]*>"/g, '"__placeholder__"');
    try {
      if (stripped.trim()) JSON.parse(stripped);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    onChange(v);
  }

  function applyPreset(preset: string) {
    handleChange(preset);
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(raw);
      handleChange(JSON.stringify(parsed, null, 2));
    } catch {
      // invalid — leave as-is
    }
  }

  const isValid = raw.trim() === "" || error === null;
  const highlighted = raw.trim() ? highlight(raw) : null;

  return (
    <div className="md:col-span-2 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">
            Output Schema
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Define the exact JSON structure your agent must return
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PresetDropdown presets={JSON_PRESETS} onSelect={applyPreset} />
        </div>
      </div>

      {/* Editor + preview side by side */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Textarea */}
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Edit JSON template</span>
            <div className="flex items-center gap-2">
              {raw.trim() && (
                <span className={clsx("flex items-center gap-1 text-xs", isValid ? "text-emerald-400" : "text-red-400")}>
                  {isValid
                    ? <><CheckCircle size={11} /> valid</>
                    : <><XCircle size={11} /> invalid</>}
                </span>
              )}
              <button
                onClick={formatJson}
                disabled={!isValid || !raw.trim()}
                className="text-xs text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                Format
              </button>
              <button
                onClick={() => setShowPreview((p) => !p)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                {showPreview ? "Hide preview" : "Show preview"}
              </button>
            </div>
          </div>
          <textarea
            value={raw}
            onChange={(e) => handleChange(e.target.value)}
            rows={14}
            spellCheck={false}
            placeholder={`{\n  "issues": [\n    {\n      "line": "<line number>",\n      "severity": "error | warning | info"\n    }\n  ]\n}`}
            className={clsx(
              "field-input resize-none font-mono text-xs leading-relaxed",
              !isValid && raw.trim() && "border-red-500/60"
            )}
          />
          {error && (
            <p className="text-xs text-red-400 font-mono">{error}</p>
          )}
        </div>

        {/* Live highlighted preview */}
        {showPreview && (
          <div className="lg:w-80 flex flex-col gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Live preview
            </span>
            <pre className="glass rounded-xl p-4 text-xs leading-relaxed overflow-auto max-h-64 lg:max-h-none lg:flex-1 font-mono text-slate-400 min-h-32">
              {highlighted
                ? <span dangerouslySetInnerHTML={{ __html: highlighted }} />
                : <span className="text-slate-600 italic">Start typing to see preview...</span>
              }
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Table-based builder for non-JSON formats ─────────────────────────────────
function TableOutputBuilder({
  format,
  fields,
  onChange,
}: {
  format: string;
  fields: OutputSchemaField[];
  onChange: (fields: OutputSchemaField[]) => void;
}) {
  const presets = TABLE_PRESETS[format] ?? [];

  function addField() { onChange([...fields, emptyField()]); }
  function update(i: number, patch: Partial<OutputSchemaField>) {
    const next = [...fields];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) { onChange(fields.filter((_, idx) => idx !== i)); }
  function applyPreset(preset: OutputSchemaField[]) { onChange(preset.map((f) => ({ ...f }))); }

  return (
    <div className="md:col-span-2 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Output Schema</p>
          <p className="text-xs text-slate-500 mt-0.5">Define the structure your agent must return</p>
        </div>
        {presets.length > 0 && (
          <PresetDropdown
            presets={presets.map((p) => ({ label: p.label, value: p.label }))}
            onSelect={(label) => {
              const found = presets.find((p) => p.label === label);
              if (found) applyPreset(found.fields);
            }}
          />
        )}
      </div>

      {fields.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_2fr_auto_auto] gap-2 px-3 py-2 border-b border-slate-800 text-xs text-slate-500 font-medium">
            <span>Field / Key</span><span>Type</span><span>Description</span><span>Req</span><span></span>
          </div>
          {fields.map((field, i) => (
            <div key={i} className={clsx("grid grid-cols-[2fr_1fr_2fr_auto_auto] gap-2 px-3 py-2 items-center", i % 2 === 0 ? "" : "bg-white/[0.02]")}>
              <input value={field.key} onChange={(e) => update(i, { key: e.target.value })} placeholder="field_name" className="field-input text-xs py-1" />
              <select value={field.type} onChange={(e) => update(i, { type: e.target.value as FieldType })} className="field-input text-xs py-1">
                {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={field.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="What this field contains" className="field-input text-xs py-1" />
              <input type="checkbox" checked={field.required} onChange={(e) => update(i, { required: e.target.checked })} className="accent-violet-500 w-4 h-4 cursor-pointer" />
              <button onClick={() => remove(i)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {fields.length === 0 && (
        <div className="glass rounded-xl px-4 py-6 text-center text-slate-500 text-xs">
          No output schema defined. Add fields or pick a preset above.
        </div>
      )}

      <button onClick={addField} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-violet-500 text-sm transition-colors w-fit">
        <Plus size={14} /> Add Field
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function OutputSchemaBuilder({ format, fields, jsonTemplate, onChange, onJsonTemplateChange }: Props) {
  if (format === "json") {
    return (
      <JsonOutputEditor
        value={jsonTemplate}
        onChange={onJsonTemplateChange}
      />
    );
  }
  return (
    <TableOutputBuilder
      format={format}
      fields={fields}
      onChange={onChange}
    />
  );
}

// ── Shared preset dropdown ────────────────────────────────────────────────────
function PresetDropdown({
  presets,
  onSelect,
}: {
  presets: { label: string; value: string }[];
  onSelect: (v: string) => void;
}) {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-900/40 hover:bg-violet-800/50 text-violet-300 border border-violet-700/40 transition-colors">
        Use Preset <ChevronDown size={12} />
      </button>
      <div className="absolute right-0 top-full mt-1 z-20 hidden group-hover:flex flex-col glass rounded-xl overflow-hidden shadow-xl min-w-48 border border-slate-700">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => onSelect(p.value)}
            className="px-4 py-2.5 text-xs text-left text-slate-300 hover:bg-violet-600/20 hover:text-white transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
