"""Pydantic models for AgentFactory execution engine."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ToolTransport(BaseModel):
    type: str = "http"                  # http | stdio
    url: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None


class ToolAuth(BaseModel):
    type: str = "none"                  # none | api-key | bearer | basic
    api_key: Optional[str] = None
    token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class QueryParam(BaseModel):
    key: str
    description: str = ""
    required: bool = False
    default: Optional[str] = None


class AgentTool(BaseModel):
    name: str
    transport: ToolTransport
    authentication: Optional[ToolAuth] = None
    env: Optional[Dict[str, str]] = None
    tool_filter: Optional[Dict[str, List[str]]] = None
    query_params: Optional[List[QueryParam]] = None


class AgentInterface(BaseModel):
    type: str = "consolechat"           # webchat | consolechat | webhook
    prompt: Optional[str] = None
    exposure: Optional[Dict[str, Any]] = None
    subscription: Optional[Dict[str, str]] = None


class AgentSkill(BaseModel):
    type: str = "local"
    path: Optional[str] = None
    url: Optional[str] = None


class ModelAuth(BaseModel):
    type: str = "api-key"
    api_key: Optional[str] = None


class AgentModel(BaseModel):
    provider: str = "openai"
    name: str = "gpt-4o-mini"
    temperature: float = 0.7
    base_url: Optional[str] = None
    authentication: Optional[ModelAuth] = None


class AgentMemory(BaseModel):
    type: str = "none"                  # none | short-term | long-term


class AgentSpec(BaseModel):
    model_config = {"extra": "ignore"}   # ignore unknown frontend fields

    spec_version: Optional[str] = "0.3.0"
    name: str = "Agent"
    description: Optional[str] = ""
    version: Optional[str] = "0.1.0"
    license: Optional[str] = "MIT"
    author: Optional[str] = None
    max_iterations: int = 5
    execution_mode: str = "sequential"
    model: AgentModel
    interfaces: List[AgentInterface] = []
    tools: Optional[Any] = None         # accepts array OR {mcp:[...]} dict
    skills: List[AgentSkill] = []
    memory: AgentMemory = AgentMemory()
    role: str = ""
    instructions: str = ""
    output_format: str = "json"
    json_output_template: Optional[str] = None
    enforcement: Optional[str] = ""


class ChatMessage(BaseModel):
    role: str                           # user | assistant | system
    content: str


class RunRequest(BaseModel):
    """Run an agent from a pre-parsed spec object."""
    spec: AgentSpec
    user_input: str
    history: List[ChatMessage] = []


class RunFileRequest(BaseModel):
    """Run an agent by reading a .md file path."""
    file_path: str
    user_input: str
    history: List[ChatMessage] = []


class RunResponse(BaseModel):
    content: str
    iterations: int = 1
    tool_calls: List[Dict[str, Any]] = []
    finish_reason: str = "stop"
