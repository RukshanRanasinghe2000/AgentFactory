import clsx from "clsx";

interface Props {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FieldBlock({ label, hint, children, className }: Props) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">
          {label}
        </label>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
