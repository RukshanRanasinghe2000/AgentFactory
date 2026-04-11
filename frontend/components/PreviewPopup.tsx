"use client";
import { useEffect, useState, useRef } from "react";
import { X, Pencil, Check, RotateCcw } from "lucide-react";

interface Props {
  label: string;
  content: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

export default function PreviewPopup({ label, content, onClose, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync if parent content changes while popup is open (non-editing)
  useEffect(() => {
    if (!editing) setDraft(content);
  }, [content, editing]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      // Move cursor to end
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }
  }, [editing]);

  // Escape: cancel edit or close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editing) {
          cancelEdit();
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, onClose]);

  function cancelEdit() {
    setDraft(content);
    setEditing(false);
  }

  function save() {
    onSave(draft);
    setEditing(false);
  }

  const hasChanges = draft !== content;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => { if (!editing) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative glass glow rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <p className="text-sm font-medium text-white">{label}</p>
            {editing && (
              <span className="text-xs text-violet-400 bg-violet-900/40 px-2 py-0.5 rounded-full border border-violet-700/40">
                editing
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <RotateCcw size={12} /> Cancel
                </button>
                <button
                  onClick={save}
                  disabled={!hasChanges}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <Check size={12} /> Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full h-full min-h-64 bg-transparent text-sm text-slate-200 leading-relaxed outline-none resize-none placeholder-slate-600 font-sans"
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
          ) : draft.trim() ? (
            <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
              {draft}
            </pre>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-slate-500 italic hover:text-slate-400 transition-colors"
            >
              No content yet — click to add
            </button>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2.5 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {editing ? "Esc to cancel · changes apply to the spec" : "Click Edit to modify"}
          </p>
          {editing && hasChanges && (
            <p className="text-xs text-amber-400">Unsaved changes</p>
          )}
        </div>
      </div>
    </div>
  );
}
