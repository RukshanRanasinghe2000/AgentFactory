"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  label: string;
  content: string;
  onClose: () => void;
}

export default function PreviewPopup({ label, content, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative glass glow rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <p className="text-sm font-medium text-white">{label}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {content.trim() ? (
            <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
              {content}
            </pre>
          ) : (
            <p className="text-sm text-slate-500 italic">No content yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
