import AgentCard from "@/components/AgentCard";
import { Plus } from "lucide-react";
import Link from "next/link";

const sampleAgents = [
  {
    name: "Code Performance Reviewer",
    description: "Analyzes code for bottlenecks, memory leaks, and optimization opportunities.",
    model: "gpt-4o",
    tools: ["file_reader", "code_analyzer"],
    version: "0.2.1",
    tags: ["code", "performance"],
  },
  {
    name: "Research Summarizer",
    description: "Searches the web and summarizes research papers into concise reports.",
    model: "claude-3-5-sonnet",
    tools: ["web_search", "pdf_reader"],
    version: "0.1.0",
    tags: ["research", "summarization"],
  },
  {
    name: "Customer Support Agent",
    description: "Handles customer queries, escalates issues, and logs tickets automatically.",
    model: "gpt-4o-mini",
    tools: ["crm_api", "email_sender"],
    version: "1.0.0",
    tags: ["support", "automation"],
  },
  {
    name: "SEO Content Writer",
    description: "Generates SEO-optimized blog posts based on keywords and target audience.",
    model: "gpt-4o",
    tools: ["web_search", "keyword_analyzer"],
    version: "0.3.0",
    tags: ["content", "seo"],
  },
];

export default function AgentsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Library</h1>
          <p className="text-slate-400 text-sm mt-1">Browse, import, and remix community agents</p>
        </div>
        <Link
          href="/builder"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} /> New Agent
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sampleAgents.map((agent) => (
          <AgentCard key={agent.name} {...agent} />
        ))}
      </div>
    </div>
  );
}
