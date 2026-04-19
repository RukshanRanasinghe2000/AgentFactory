"use client";
import { useState } from "react";
import { ArrowRight, Loader2, SkipForward, MessageSquare } from "lucide-react";

export interface ClarifyQuestion {
  id: string;
  question: string;
  hint: string;
  field: string;
}

interface Props {
  idea: string;
  questions: ClarifyQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  onSkip: () => void;
}

const FIELD_COLORS: Record<string, string> = {
  role:          "text-violet-400 bg-violet-900/30 border-violet-700/40",
  instructions:  "text-sky-400 bg-sky-900/30 border-sky-700/40",
  output_format: "text-emerald-400 bg-emerald-900/30 border-emerald-700/40",
  tools:         "text-amber-400 bg-amber-900/30 border-amber-700/40",
  interfaces:    "text-pink-400 bg-pink-900/30 border-pink-700/40",
  enforcement:   "text-red-400 bg-red-900/30 border-red-700/40",
};

export default function ClarificationStep({ idea, questions, onSubmit, onSkip }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, ""]))
  );
  const [submitting, setSubmitting] = useState(false);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    onSubmit(answers);
  }

  const answeredCount = Object.values(answers).filter((a) => a.trim()).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <MessageSquare size={20} className="text-violet-400" />
            <span className="text-xs text-violet-400 bg-violet-900/40 px-3 py-1 rounded-full border border-violet-700/40">
              Clarification
            </span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">A few quick questions</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Help us build a better spec for{" "}
            <span className="text-slate-200 italic">&ldquo;{idea.length > 60 ? idea.slice(0, 60) + "…" : idea}&rdquo;</span>
          </p>
          <p className="text-slate-500 text-xs max-w-md mx-auto mt-1">
            If any of these questions are not relevant to your idea, feel free to skip them.
          </p>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-4">
          {questions.map((q, i) => {
            const colorClass = FIELD_COLORS[q.field] ?? "text-slate-400 bg-slate-800 border-slate-700";
            return (
              <div key={q.id} className="glass rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-slate-600 mt-0.5 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-white font-medium">{q.question}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
                        {q.field.replace("_", " ")}
                      </span>
                    </div>
                    <textarea
                      value={answers[q.id]}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder={q.hint}
                      rows={2}
                      className="field-input resize-none text-sm placeholder-slate-600"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.metaKey) handleSubmit();
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {questions.map((q) => (
              <div
                key={q.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  answers[q.id]?.trim() ? "bg-violet-400" : "bg-slate-700"
                }`}
              />
            ))}
            <span className="text-xs text-slate-500 ml-1">
              {answeredCount}/{questions.length} answered
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSkip}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <SkipForward size={13} /> Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {submitting
                ? <><Loader2 size={14} className="animate-spin" /> Building spec...</>
                : <><ArrowRight size={14} /> Build Spec</>
              }
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 text-center">
          Answer what you can — unanswered questions are skipped · ⌘Enter to submit
        </p>
      </div>
    </div>
  );
}
