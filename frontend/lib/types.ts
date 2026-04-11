export interface AgentTool {
  name: string;
  description?: string;
}

export interface AgentSpec {
  spec_version: string;
  name: string;
  description: string;
  version: string;
  model: {
    provider: string;
    name: string;
    temperature: number;
  };
  max_iterations: number;
  role: string;
  instructions: string;
  output_format: string;
  execution_mode: "sequential" | "agentic";
  memory: {
    type: "none" | "short-term" | "long-term";
  };
  tools: AgentTool[];
  input_schema: Record<string, string>;
  output_schema: Record<string, string>;
  enforcement: string;
}

export const defaultSpec = (): AgentSpec => ({
  spec_version: "0.3.0",
  name: "",
  description: "",
  version: "0.1.0",
  model: {
    provider: "openai",
    name: "gpt-4o",
    temperature: 0.7,
  },
  max_iterations: 5,
  role: "",
  instructions: "",
  output_format: "markdown",
  execution_mode: "sequential",
  memory: { type: "short-term" },
  tools: [],
  input_schema: {},
  output_schema: {},
  enforcement: "",
});
