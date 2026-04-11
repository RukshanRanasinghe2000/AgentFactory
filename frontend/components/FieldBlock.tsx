import { Eye } from "lucide-react";
import clsx from "clsx";

interface Props {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  onPreview?: () => void;
}

export default function FieldBlock({ label, hint, children, className, onPreview }: Props) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">
          {label}
        </label>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            title={`Preview ${label}`}
            className="ml-auto text-slate-600 hover:text-violet-400 transition-colors"
          >
            <Eye size={13} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
