import { Bot, Wrench, Tag } from "lucide-react";
import Link from "next/link";

interface Props {
  name: string;
  description: string;
  model: string;
  tools: string[];
  version: string;
  tags: string[];
}

export default function AgentCard({ name, description, model, tools, version, tags }: Props) {
  return (
    <div className="glass rounded-xl p-5 flex flex-col gap-4 hover:border-violet-700/50 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-violet-900/40 text-violet-400 group-hover:bg-violet-800/50 transition-colors">
          <Bot size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium text-sm truncate">{name}</p>
            <span className="text-xs text-slate-500 shrink-0">v{version}</span>
          </div>
          <p className="text-slate-400 text-xs mt-1 line-clamp-2">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400">
            <Tag size={10} /> {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Wrench size={11} /> {tools.length} tools
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{model}</span>
        </div>
        <Link
          href="/builder"
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          Open →
        </Link>
      </div>
    </div>
  );
}
