"""
MCP tool invocation — HTTP and stdio transports.
"""
import json
import subprocess
import httpx
from typing import Any
from models import AgentTool
from spec_parser import resolve_env_value


async def call_tool(tool: AgentTool, tool_name: str, arguments: dict[str, Any]) -> Any:
    """Invoke a single MCP tool call and return the result."""
    transport = tool.transport

    if transport.type == "http":
        return await _call_http_tool(tool, tool_name, arguments)
    elif transport.type == "stdio":
        return await _call_stdio_tool(tool, tool_name, arguments)
    else:
        raise ValueError(f"Unsupported transport type: {transport.type}")


async def _call_http_tool(tool: AgentTool, tool_name: str, arguments: dict) -> Any:
    url = resolve_env_value(tool.transport.url)
    if not url:
        raise ValueError(f"Tool '{tool.name}' has no URL configured")

    headers = {"Content-Type": "application/json"}

    # Add auth headers
    auth = tool.authentication
    if auth:
        auth_type = auth.type
        if auth_type == "bearer":
            token = resolve_env_value(auth.token)
            headers["Authorization"] = f"Bearer {token}"
        elif auth_type == "api-key":
            key = resolve_env_value(auth.api_key)
            headers["Authorization"] = f"Bearer {key}"
        elif auth_type == "basic":
            import base64
            username = resolve_env_value(auth.username) or ""
            password = resolve_env_value(auth.password) or ""
            creds = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers["Authorization"] = f"Basic {creds}"

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise RuntimeError(f"Tool error: {data['error']}")
        return data.get("result", {})


async def _call_stdio_tool(tool: AgentTool, tool_name: str, arguments: dict) -> Any:
    command = tool.transport.command
    args = tool.transport.args or []
    if not command:
        raise ValueError(f"Tool '{tool.name}' has no command configured")

    # Build env
    import os
    env = os.environ.copy()
    if tool.env:
        for k, v in tool.env.items():
            resolved = resolve_env_value(v)
            if resolved:
                env[k] = resolved

    request_payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    })

    proc = subprocess.run(
        [command] + args,
        input=request_payload,
        capture_output=True,
        text=True,
        env=env,
        timeout=30,
    )

    if proc.returncode != 0:
        raise RuntimeError(f"Tool process error: {proc.stderr}")

    data = json.loads(proc.stdout)
    if "error" in data:
        raise RuntimeError(f"Tool error: {data['error']}")
    return data.get("result", {})


def get_tool_definitions(tools_block: Any) -> list[dict]:
    """Convert the spec tools block into OpenAI-style function definitions."""
    if not tools_block:
        return []
    if isinstance(tools_block, list):
        mcp_tools = tools_block
    elif isinstance(tools_block, dict):
        mcp_tools = tools_block.get("mcp", [])
    else:
        return []
    definitions = []
    for tool in mcp_tools:
        if not isinstance(tool, dict):
            continue
        definitions.append({
            "type": "function",
            "function": {
                "name": tool.get("name", "unknown"),
                "description": f"MCP tool: {tool.get('name', '')}",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "input": {"type": "string", "description": "Tool input"}
                    },
                },
            },
        })
    return definitions
