export interface AgentTool {
  name: string;
  transport: {
    type: "http" | "stdio";
    url?: string;
    command?: string;
    args?: string[];
  };
  authentication?: {
    type: "api-key" | "bearer" | "basic" | "none";
    token?: string;
    api_key?: string;
    username?: string;
    password?: string;
  };
  env?: Record<string, string>;
  tool_filter?: {
    allow: string[];
  };
}

export interface AgentSkill {
  type: "local" | "remote";
  path?: string;
  url?: string;
}

export interface AgentInterface {
  type: "webchat" | "consolechat" | "webhook";
  prompt?: string;
  exposure?: {
    http?: { path: string };
  };
  subscription?: {
    protocol: string;
    callback: string;
    secret?: string;
  };
}

export type FieldType = "string" | "number" | "boolean" | "array" | "object";
export type SeverityOption = "error" | "warning" | "info";

export interface OutputSchemaField {
  key: string;
  type: FieldType;
  description: string;
  required: boolean;
  enum?: string[];
}

export interface AgentSpec {
  spec_version: string;
  name: string;
  description: string;
  version: string;
  license: string;
  author: string;
  provider: { name: string; url: string };
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
  interfaces: AgentInterface[];
  skills: AgentSkill[];
  role: string;
  instructions: string;
  output_format: string;
  execution_mode: "sequential" | "agentic";
  memory: { type: "none" | "short-term" | "long-term" };
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
  license: "",
  author: "",
  provider: { name: "", url: "" },
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
  interfaces: [],
  skills: [],
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
