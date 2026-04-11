import IdeaInput from "@/components/IdeaInput";
import { Zap, FileText, Rocket, Puzzle } from "lucide-react";

const features = [
  {
    icon: <Zap size={20} className="text-violet-400" />,
    title: "Idea → Spec in seconds",
    desc: "Type a rough idea. The AI refines it into a structured agent spec automatically.",
  },
  {
    icon: <FileText size={20} className="text-violet-400" />,
    title: "Portable .md Agent Files",
    desc: "Every agent is a clean Markdown file you can version, share, or import anywhere.",
  },
  {
    icon: <Puzzle size={20} className="text-violet-400" />,
    title: "No-code Builder UI",
    desc: "Edit every field visually. Add tools, memory, schemas — no YAML knowledge needed.",
  },
  {
    icon: <Rocket size={20} className="text-violet-400" />,
    title: "One-click Code Generation",
    desc: "Generate ready-to-run Python or Node.js agent code from your spec instantly.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center px-6 pt-24 pb-32">
      {/* Hero */}
      <div className="text-center max-w-2xl mb-16">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-violet-900/50 text-violet-300 border border-violet-700/50 mb-6">
          Spec-driven AI Agent Builder
        </span>
        <h1 className="text-5xl font-bold text-white leading-tight mb-5">
          Build AI Agents{" "}
          <span className="text-violet-400">Without Code</span>
        </h1>
        <p className="text-slate-400 text-lg mb-10">
          Describe your idea. AgentFactory refines it, generates a structured spec,
          and produces deployable agent code — all in minutes.
        </p>
        <IdeaInput />
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl w-full">
        {features.map((f) => (
          <div key={f.title} className="glass rounded-xl p-5 flex gap-4">
            <div className="mt-0.5 shrink-0">{f.icon}</div>
            <div>
              <p className="text-white font-medium text-sm mb-1">{f.title}</p>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
