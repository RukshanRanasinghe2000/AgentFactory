export interface AgentTool {
  name: string;
  description?: string;
}

export type FieldType = "string" | "number" | "boolean" | "array" | "object";
export type SeverityOption = "error" | "warning" | "info";

export interface OutputSchemaField {
  key: string;
  type: FieldType;
  description: string;
  required: boolean;
  // for enum-like fields (e.g. severity)
  enum?: string[];
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
    base_url: string;
    authentication: {
      type: "api-key" | "bearer" | "none";
      api_key: string;
    };
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
  output_schema_fields: OutputSchemaField[];
  json_output_template: string;
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
    base_url: "",
    authentication: {
      type: "api-key",
      api_key: "${env:MODEL_API_KEY}",
    },
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
  output_schema_fields: [],
  json_output_template: "",
  enforcement: "",
});
