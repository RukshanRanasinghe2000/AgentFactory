"""
Interface handlers for AgentFactory agents.

webchat  — WebSocket endpoint for real-time browser chat sessions
webhook  — HTTP POST endpoint that receives payloads and runs the agent
"""
import hashlib
import hmac
import json
import re
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from models import AgentSpec, ChatMessage, RunResponse
from executor import run_agent


# Webchat — WebSocket handler

async def handle_webchat(websocket: WebSocket, spec: AgentSpec) -> None:
    """
    Manages a full webchat session over WebSocket.

    Message protocol (JSON):
      Client → Server:  { "type": "message", "content": "..." }
      Server → Client:  { "type": "message",  "content": "...", "finish_reason": "stop" }
                        { "type": "error",    "content": "..." }
                        { "type": "connected","agent": "<name>" }
    """
    await websocket.accept()
    history: list[ChatMessage] = []

    await websocket.send_json({
        "type": "connected",
        "agent": spec.name,
        "model": f"{spec.model.provider}/{spec.model.name}",
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "content": "Invalid JSON"})
                continue

            if data.get("type") != "message":
                continue

            user_input = data.get("content", "").strip()
            if not user_input:
                continue

            try:
                result: RunResponse = await run_agent(spec, user_input, history)

                # Update history
                history.append(ChatMessage(role="user", content=user_input))
                history.append(ChatMessage(role="assistant", content=result.content))

                await websocket.send_json({
                    "type": "message",
                    "content": result.content,
                    "finish_reason": result.finish_reason,
                    "iterations": result.iterations,
                    "tool_calls": result.tool_calls,
                })
            except Exception as e:
                await websocket.send_json({"type": "error", "content": str(e)})

    except WebSocketDisconnect:
        pass


# Webhook — HTTP payload handler 

def _interpolate_prompt(template: str, payload: dict[str, Any]) -> str:
    """
    Replace ${http:payload.field.nested} placeholders with values from the payload.

    Example:
      template: "Analyze PR ${http:payload.pull_request.url}"
      payload:  {"pull_request": {"url": "https://github.com/..."}}
      result:   "Analyze PR https://github.com/..."
    """
    def resolve(match: re.Match) -> str:
        path = match.group(1)  # e.g. "payload.pull_request.url"
        parts = path.split(".")
        # First part is always "payload" — skip it
        if parts[0] == "payload":
            parts = parts[1:]
        value: Any = payload
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part, "")
            else:
                return ""
        return str(value)

    return re.sub(r"\$\{http:([^}]+)\}", resolve, template)


def _verify_webhook_signature(
    body: bytes,
    secret: str,
    signature_header: str | None,
) -> bool:
    """
    Verify HMAC-SHA256 webhook signature.
    Supports GitHub-style: sha256=<hex>
    """
    if not secret or not signature_header:
        return True  # No secret configured — skip verification

    expected = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    # Strip prefix if present (e.g. "sha256=abc123")
    received = signature_header.split("=")[-1]
    return hmac.compare_digest(expected, received)


async def handle_webhook(
    spec: AgentSpec,
    payload: dict[str, Any],
    raw_body: bytes,
    signature_header: str | None = None,
) -> RunResponse:
    """
    Process an incoming webhook payload for an agent.

    1. Verify signature if a secret is configured
    2. Check action filter if the interface defines one
    3. Interpolate the prompt template with payload values
    4. Run the agent and return the response
    """
    # Find the webhook interface config
    webhook_iface = next(
        (i for i in spec.interfaces if i.type == "webhook"), None
    )

    # Signature verification
    if webhook_iface and webhook_iface.subscription:
        secret = webhook_iface.subscription.get("secret", "")
        if secret and secret.startswith("${env:"):
            import os
            secret = os.getenv(secret[6:-1], "")
        if not _verify_webhook_signature(raw_body, secret, signature_header):
            raise PermissionError("Webhook signature verification failed")

    # Build user input from prompt template or raw payload
    if webhook_iface and webhook_iface.prompt:
        user_input = _interpolate_prompt(webhook_iface.prompt, payload)
    else:
        user_input = json.dumps(payload, indent=2)

    return await run_agent(spec, user_input, [])
