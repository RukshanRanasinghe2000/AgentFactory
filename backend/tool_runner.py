"""
MCP tool invocation — HTTP and stdio transports.
Query params with {PLACEHOLDER} syntax are resolved from LLM-extracted arguments.
"""
import json
import re
import subprocess
import httpx
from typing import Any
from models import AgentTool
from spec_parser import resolve_env_value


async def call_tool(tool: AgentTool, tool_name: str, arguments: dict[str, Any]) -> Any:
    """Invoke a single MCP tool call and return the result."""
    if tool.transport.type == "http":
        return await _call_http_tool(tool, tool_name, arguments)
    elif tool.transport.type == "stdio":
        return await _call_stdio_tool(tool, tool_name, arguments)
    else:
        raise ValueError(f"Unsupported transport type: {tool.transport.type}")


def _resolve_url(tool: AgentTool, arguments: dict[str, Any]) -> str:
    """
    Build the final URL by:
    1. Resolving ${env:VAR} placeholders
    2. Substituting {PARAM_KEY} placeholders from LLM-extracted arguments
    3. Appending any remaining query_params that weren't in the URL template
    """
    url = resolve_env_value(tool.transport.url) or ""
    if not url:
        raise ValueError(f"Tool '{tool.name}' has no URL configured")

    # Replace {PLACEHOLDER} patterns with values from arguments
    def replace_placeholder(match: re.Match) -> str:
        key = match.group(1)
        # Try exact key, then lowercase, then uppercase
        val = (arguments.get(key) or arguments.get(key.lower()) or
               arguments.get(key.upper()) or "")
        return str(val) if val else match.group(0)  # leave unreplaced if not found

    url = re.sub(r"\{([^}]+)\}", replace_placeholder, url)

    # Append any query_params defined in spec that aren't already in the URL
    if tool.query_params:
        existing_keys = set(re.findall(r"[?&]([^=&]+)=", url))
        extra_pairs = []
        for p in tool.query_params:
            if p.key in existing_keys:
                continue
            val = (arguments.get(p.key) or arguments.get(p.key.lower()) or
                   arguments.get(p.key.upper()) or p.default or "")
            if val:
                extra_pairs.append(f"{p.key}={val}")
        if extra_pairs:
            sep = "&" if "?" in url else "?"
            url = url + sep + "&".join(extra_pairs)

    return url


async def _call_http_tool(tool: AgentTool, tool_name: str, arguments: dict) -> Any:
    url = _resolve_url(tool, arguments)
    headers = {"Content-Type": "application/json"}

    auth = tool.authentication
    if auth:
        if auth.type == "bearer":
            token = resolve_env_value(auth.token)
            headers["Authorization"] = f"Bearer {token}"
        elif auth.type == "api-key":
            key = resolve_env_value(auth.api_key)
            headers["Authorization"] = f"Bearer {key}"
        elif auth.type == "basic":
            import base64
            username = resolve_env_value(auth.username) or ""
            password = resolve_env_value(auth.password) or ""
            creds = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers["Authorization"] = f"Basic {creds}"

    # For REST APIs (non-MCP), do a plain GET if no JSON-RPC method needed
    # Detect by checking if URL looks like a REST endpoint (no /mcp/ path)
    is_rest = "/mcp" not in url and "jsonrpc" not in url

    async with httpx.AsyncClient(timeout=30) as client:
        if is_rest:
            resp = await client.get(url, headers=headers)
        else:
            payload = {
                "jsonrpc": "2.0", "id": 1,
                "method": "tools/call",
                "params": {"name": tool_name, "arguments": arguments},
            }
            resp = await client.post(url, json=payload, headers=headers)

        resp.raise_for_status()

        # Try JSON, fall back to text
        try:
            data = resp.json()
        except Exception:
            return {"text": resp.text}

        if isinstance(data, dict) and "error" in data:
            raise RuntimeError(f"Tool error: {data['error']}")
        # Unwrap JSON-RPC result if present
        return data.get("result", data) if isinstance(data, dict) else data


async def _call_stdio_tool(tool: AgentTool, tool_name: str, arguments: dict) -> Any:
    command = tool.transport.command
    args = tool.transport.args or []
    if not command:
        raise ValueError(f"Tool '{tool.name}' has no command configured")

    import os
    env = os.environ.copy()
    if tool.env:
        for k, v in tool.env.items():
            resolved = resolve_env_value(v)
            if resolved:
                env[k] = resolved

    request_payload = json.dumps({
        "jsonrpc": "2.0", "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    })

    proc = subprocess.run(
        [command] + args,
        input=request_payload,
        capture_output=True, text=True,
        env=env, timeout=30,
    )

    if proc.returncode != 0:
        raise RuntimeError(f"Tool process error: {proc.stderr}")

    data = json.loads(proc.stdout)
    if "error" in data:
        raise RuntimeError(f"Tool error: {data['error']}")
    return data.get("result", {})


def get_tool_definitions(tools_block: Any) -> list[dict]:
    """
    Convert the spec tools block into OpenAI function definitions.
    Query params are exposed as function parameters so the LLM extracts
    their values from the user's message automatically.
    """
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

        tool_name = tool.get("name", "unknown")
        # Sanitize: replace spaces and special chars with underscores
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", tool_name).strip("_") or "tool"
        query_params = tool.get("query_params", [])

        # Build parameters schema from query_params
        properties: dict[str, Any] = {}
        required_keys: list[str] = []

        for p in query_params:
            key = p.get("key", "")
            if not key:
                continue
            properties[key] = {
                "type": "string",
                "description": p.get("description", f"Value for {key}"),
            }
            if p.get("required", False):
                required_keys.append(key)

        # Fallback: extract {PLACEHOLDER} keys from URL if no query_params defined
        if not properties:
            url = tool.get("transport", {}).get("url", "")
            for placeholder in re.findall(r"\{([^}]+)\}", url):
                properties[placeholder] = {
                    "type": "string",
                    "description": f"Value for {placeholder}",
                }
                required_keys.append(placeholder)

        # Always include a generic input param if nothing else
        if not properties:
            properties["input"] = {"type": "string", "description": "Tool input"}

        definitions.append({
            "type": "function",
            "function": {
                "name": safe_name,
                "description": f"Call the {tool_name} tool",
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required_keys,
                },
            },
        })

    return definitions
