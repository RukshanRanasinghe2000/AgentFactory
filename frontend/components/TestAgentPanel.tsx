"use client";
import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import type { AgentSpec } from "@/lib/types";
import clsx from "clsx";

interface Props {
  spec: AgentSpec;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function TestAgentPanel({ spec, onClose }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Strip ${env:...} placeholders — backend resolves its own env vars
      const cleanSpec = {
        ...spec,
        model: {
          ...spec.model,
          authentication: {
            ...spec.model.authentication,
            api_key: spec.model.authentication.api_key?.startsWith("${env:")
              ? ""
              : spec.model.authentication.api_key,
          },
        },
      };

      const res = await fetch("http://localhost:8000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec: cleanSpec,
          user_input: input,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
      }

      const data = await res.json();
      const assistantMsg: Message = { role: "assistant", content: data.content };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Test Agent: <span className="text-violet-400">{spec.name || "Untitled Agent"}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Live execution with {spec.model.provider}/{spec.model.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/30">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                <Send size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 max-w-xs">
                Ask your agent something to test its instructions and persona.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                m.role === "user" 
                  ? "bg-violet-600 text-white rounded-tr-none" 
                  : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
              )}>
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-2 shadow-sm">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs font-medium animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative flex items-center"
          >
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message agent..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all shadow-inner"
            />
            <button 
              disabled={loading || !input.trim()}
              type="submit"
              className="absolute right-2 p-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-lg transition-all shadow-lg active:scale-95"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium opacity-50">
            <span>{spec.execution_mode} mode</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>{spec.output_format} format</span>
          </div>
        </div>
      </div>
    </div>
  );
}
