"""
Core agent execution engine.
Supports sequential and agentic (loop) execution modes.
Handles OpenAI-compatible, Anthropic, and Google providers.
"""
import json
import os
import re
from typing import Any
import openai
import anthropic
from models import AgentSpec, ChatMessage, RunResponse
from spec_parser import resolve_env_value
from tool_runner import get_tool_definitions, call_tool, AgentTool
from models import ToolTransport, ToolAuth


def _build_system_prompt(spec: AgentSpec) -> str:
    parts = []
    if spec.role:
        parts.append(spec.role)
    if spec.instructions:
        parts.append(f"# Instructions\n\n{spec.instructions}")
    if spec.enforcement:
        parts.append(f"# Rules\n\n{spec.enforcement}")
    # If tools are configured, explicitly instruct the LLM to use them
    if spec.tools:
        raw_list = spec.tools if isinstance(spec.tools, list) else spec.tools.get("mcp", [])
        if raw_list:
            tool_names = [t.get("name", "") for t in raw_list if isinstance(t, dict) and t.get("name")]
            if tool_names:
                parts.append(
                    f"# Tool Usage\n\nYou have access to the following tools: {', '.join(tool_names)}. "
                    f"When the user's request requires real-time or external data, call the appropriate tool. "
                    f"If no tool is relevant, answer from your own knowledge."
                )
    if spec.output_format == "json" and spec.json_output_template:
        parts.append(
            f"# Output Format\n\nReturn ONLY valid JSON matching this structure:\n\n"
            f"```json\n{spec.json_output_template}\n```"
        )
    elif spec.output_format == "markdown":
        parts.append("# Output Format\n\nRespond in well-structured Markdown.")
    return "\n\n".join(parts)


def _resolve_api_key(spec: AgentSpec) -> str:
    auth = spec.model.authentication
    if not auth:
        return ""
    key = resolve_env_value(auth.api_key) or ""
    # Fallback to env vars by provider
    if not key:
        fallbacks = {
            "openai": "OPENAI_API_KEY",
            "groq": "GROQ_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "google": "GOOGLE_API_KEY",
        }
        env_var = fallbacks.get(spec.model.provider)
        if env_var:
            key = os.getenv(env_var, "")
    return key


def _get_mcp_tools(spec: AgentSpec) -> list[AgentTool]:
    """Extract AgentTool objects from the raw tools block (array or {mcp:[...]} dict)."""
    if not spec.tools:
        return []

    # Frontend sends an array directly; backend/YAML sends {mcp: [...]}
    raw_list = []
    if isinstance(spec.tools, list):
        raw_list = spec.tools
    elif isinstance(spec.tools, dict):
        raw_list = spec.tools.get("mcp", [])

    tools = []
    for t in raw_list:
        if not isinstance(t, dict):
            continue
        transport_data = t.get("transport", {})
        auth_data = t.get("authentication")
        qp_data = t.get("query_params", [])
        tools.append(AgentTool(
            name=t.get("name", ""),
            transport=ToolTransport(**transport_data),
            authentication=ToolAuth(**auth_data) if auth_data else None,
            env=t.get("env"),
            tool_filter=t.get("tool_filter"),
            query_params=qp_data if qp_data else None,
        ))
    return tools


async def run_agent(
    spec: AgentSpec,
    user_input: str,
    history: list[ChatMessage],
) -> RunResponse:
    provider = spec.model.provider.lower()

    if provider == "anthropic":
        return await _run_anthropic(spec, user_input, history)
    else:
        return await _run_openai_compatible(spec, user_input, history)


# OpenAI-compatible (OpenAI, Groq, Ollama, custom) 

async def _run_openai_compatible(
    spec: AgentSpec,
    user_input: str,
    history: list[ChatMessage],
) -> RunResponse:
    api_key = _resolve_api_key(spec)
    base_url = resolve_env_value(spec.model.base_url)

    # Provider-specific base URLs
    if not base_url:
        if spec.model.provider == "groq":
            base_url = "https://api.groq.com/openai/v1"
        elif spec.model.provider == "ollama":
            base_url = "http://localhost:11434/v1"

    client = openai.AsyncOpenAI(
        api_key=api_key or "none",
        base_url=base_url or None,
    )

    system_prompt = _build_system_prompt(spec)
    messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_input})

    tool_defs = get_tool_definitions(spec.tools)
    mcp_tools = _get_mcp_tools(spec)
    # Map both original name and sanitized name → tool
    tool_map = {}
    for t in mcp_tools:
        tool_map[t.name] = t
        safe = re.sub(r"[^a-zA-Z0-9_-]", "_", t.name).strip("_") or "tool"
        tool_map[safe] = t

    response_format = {"type": "json_object"} if spec.output_format == "json" else None
    all_tool_calls: list[dict] = []
    iterations = 0
    # When tools are present we always need at least 3 iterations:
    # 1 = LLM decides to call tool, 2 = tool result returned, 3 = LLM generates final response
    if tool_defs:
        max_iter = max(spec.max_iterations, 3)
    else:
        max_iter = spec.max_iterations if spec.execution_mode == "agentic" else 1

    # Track whether we've already received at least one tool result
    tool_results_received = False

    while iterations < max_iter:
        iterations += 1
        kwargs: dict[str, Any] = {
            "model": spec.model.name,
            "messages": messages,
            "temperature": spec.model.temperature,
        }
        if response_format and not tool_defs:
            kwargs["response_format"] = response_format
        if tool_defs:
            kwargs["tools"] = tool_defs
            # After tool results are in, force a text response — no more tool calls
            kwargs["tool_choice"] = "none" if tool_results_received else "auto"

        completion = await client.chat.completions.create(**kwargs)
        choice = completion.choices[0]
        msg = choice.message

        # No tool calls — we're done
        if not msg.tool_calls:
            return RunResponse(
                content=msg.content or "",
                iterations=iterations,
                tool_calls=all_tool_calls,
                finish_reason=choice.finish_reason or "stop",
            )

        # Handle tool calls (agentic loop)
        # Groq requires content field on assistant messages even when tool_calls present
        assistant_msg = msg.model_dump(exclude_none=True)
        if "content" not in assistant_msg or assistant_msg["content"] is None:
            assistant_msg["content"] = ""
        messages.append(assistant_msg)

        for tc in msg.tool_calls:
            fn_name = tc.function.name
            try:
                fn_args = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                fn_args = {}

            tool_result = {"error": f"Tool '{fn_name}' not found"}
            if fn_name in tool_map:
                try:
                    tool_result = await call_tool(tool_map[fn_name], fn_name, fn_args)
                except Exception as e:
                    tool_result = {"error": str(e)}

            # Truncate large tool results to avoid overwhelming the context window
            result_str = json.dumps(tool_result)
            if len(result_str) > 8000:
                # For weather/forecast APIs: keep only the first few entries
                if isinstance(tool_result, dict) and "list" in tool_result:
                    truncated = dict(tool_result)
                    truncated["list"] = tool_result["list"][:5]  # first 5 forecast entries
                    result_str = json.dumps(truncated)
                else:
                    result_str = result_str[:8000] + "... [truncated]"

            all_tool_calls.append({"name": fn_name, "args": fn_args, "result": tool_result})
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result_str,
            })

        # Mark that tool results are now in the message history
        tool_results_received = True

    # Max iterations reached
    return RunResponse(
        content="Max iterations reached without a final response.",
        iterations=iterations,
        tool_calls=all_tool_calls,
        finish_reason="max_iterations",
    )


# ── Anthropic 

async def _run_anthropic(
    spec: AgentSpec,
    user_input: str,
    history: list[ChatMessage],
) -> RunResponse:
    api_key = _resolve_api_key(spec)
    client = anthropic.AsyncAnthropic(api_key=api_key)
    system_prompt = _build_system_prompt(spec)

    messages = []
    for msg in history:
        if msg.role != "system":
            messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_input})

    response = await client.messages.create(
        model=spec.model.name,
        max_tokens=4096,
        system=system_prompt,
        messages=messages,
    )

    content = response.content[0].text if response.content else ""
    return RunResponse(
        content=content,
        iterations=1,
        finish_reason=response.stop_reason or "stop",
    )
