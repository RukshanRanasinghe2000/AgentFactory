"""
AgentFactory Execution Engine
Reads .md agent specs and runs them against LLM providers.
"""
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from models import AgentSpec, RunRequest, RunFileRequest, RunResponse, ChatMessage
from spec_parser import parse_md_spec
from executor import run_agent
from interfaces import handle_webchat, handle_webhook

load_dotenv()

app = FastAPI(
    title="AgentFactory Execution Engine",
    description="Reads .md agent specs and runs them against LLM providers.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENTS_DIR = Path(__file__).parent.parent / "frontend" / "factory_agent"


def _load_agent(agent_name: str) -> AgentSpec:
    file_path = AGENTS_DIR / f"{agent_name}.md"
    if not file_path.exists():
        raise HTTPException(404, detail=f"Agent '{agent_name}' not found in factory_agent/")
    content = file_path.read_text(encoding="utf-8")
    return AgentSpec(**parse_md_spec(content))


# Health 

@app.get("/")
async def root():
    return {"status": "running", "service": "AgentFactory Execution Engine", "version": "0.1.0"}


# Run from spec object 

@app.post("/run", response_model=RunResponse)
async def run_from_spec(request: RunRequest):
    try:
        return await run_agent(request.spec, request.user_input, request.history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Run from .md file path 

@app.post("/run/file", response_model=RunResponse)
async def run_from_file(request: RunFileRequest):
    file_path = Path(request.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
    try:
        spec = AgentSpec(**parse_md_spec(file_path.read_text(encoding="utf-8")))
        return await run_agent(spec, request.user_input, request.history)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Spec parse error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Upload and run a .md file 

@app.post("/run/upload", response_model=RunResponse)
async def run_uploaded_spec(file: UploadFile = File(...), user_input: str = "Hello"):
    if not file.filename or not file.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="File must be a .md spec file")
    try:
        spec = AgentSpec(**parse_md_spec((await file.read()).decode("utf-8")))
        return await run_agent(spec, user_input, [])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Spec parse error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Run by agent name 

class NamedRunRequest(BaseModel):
    user_input: str
    history: list[ChatMessage] = []


@app.post("/run/{agent_name}", response_model=RunResponse)
async def run_named_agent(agent_name: str, request: NamedRunRequest):
    try:
        return await run_agent(_load_agent(agent_name), request.user_input, request.history)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Parse a .md file (no execution) 

@app.post("/parse")
async def parse_spec_file(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="File must be a .md spec file")
    try:
        return {"spec": parse_md_spec((await file.read()).decode("utf-8"))}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# List available agents 

@app.get("/agents")
async def list_agents():
    if not AGENTS_DIR.exists():
        return {"agents": []}
    agents = []
    for md_file in sorted(AGENTS_DIR.glob("*.md")):
        try:
            spec_dict = parse_md_spec(md_file.read_text(encoding="utf-8"))
            agents.append({
                "name": md_file.stem,
                "file": md_file.name,
                "spec_name": spec_dict.get("name", md_file.stem),
                "description": spec_dict.get("description", ""),
                "version": spec_dict.get("version", ""),
                "model": spec_dict.get("model", {}).get("name", ""),
                "interfaces": [i.get("type") for i in spec_dict.get("interfaces", [])],
            })
        except Exception:
            agents.append({"name": md_file.stem, "file": md_file.name, "error": "parse failed"})
    return {"agents": agents}


# Webchat — WebSocket (named agent) 

@app.websocket("/webchat/{agent_name}")
async def webchat_named(websocket: WebSocket, agent_name: str):
    """
    WebSocket endpoint for real-time webchat with a named agent.

    Connect:  ws://localhost:8000/webchat/<agent_name>
    Send:     { "type": "message", "content": "your message" }
    Receive:  { "type": "connected", "agent": "...", "model": "..." }
              { "type": "message",   "content": "...", "finish_reason": "stop" }
              { "type": "error",     "content": "error text" }
    """
    try:
        spec = _load_agent(agent_name)
    except HTTPException as e:
        await websocket.accept()
        await websocket.send_json({"type": "error", "content": e.detail})
        await websocket.close()
        return
    await handle_webchat(websocket, spec)


# Webchat — WebSocket (inline spec) 

@app.websocket("/webchat")
async def webchat_inline(websocket: WebSocket):
    """
    WebSocket endpoint for webchat with an inline spec.

    First message: { "type": "init", "spec": { ...AgentSpec... } }
    Then send:     { "type": "message", "content": "..." }
    """
    await websocket.accept()
    try:
        data = json.loads(await websocket.receive_text())
        if data.get("type") != "init" or "spec" not in data:
            await websocket.send_json({"type": "error", "content": "First message must be {type: init, spec: {...}}"})
            await websocket.close()
            return
        spec = AgentSpec(**data["spec"])
    except Exception as e:
        await websocket.send_json({"type": "error", "content": f"Init failed: {e}"})
        await websocket.close()
        return
    await handle_webchat(websocket, spec)


# ── Webhook — HTTP POST (named agent) 

@app.post("/webhook/{agent_name}")
async def webhook_named(
    agent_name: str,
    request: Request,
    x_hub_signature_256: str | None = Header(default=None),
    x_signature: str | None = Header(default=None),
):
    """
    Webhook endpoint for a named agent.

    POST /webhook/<agent_name>
    Body: any JSON payload

    The agent's interface.prompt template is interpolated with ${http:payload.field} values.
    Signature verified via X-Hub-Signature-256 or X-Signature header.
    """
    try:
        spec = _load_agent(agent_name)
    except HTTPException:
        raise

    raw_body = await request.body()
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")

    try:
        result = await handle_webhook(spec, payload, raw_body, x_hub_signature_256 or x_signature)
        return {"content": result.content, "finish_reason": result.finish_reason,
                "iterations": result.iterations, "tool_calls": result.tool_calls}
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Webhook — HTTP POST (inline spec) 

@app.post("/webhook")
async def webhook_inline(
    request: Request,
    x_hub_signature_256: str | None = Header(default=None),
    x_signature: str | None = Header(default=None),
):
    """
    Webhook endpoint with inline spec.

    POST /webhook
    Body: { "spec": {...AgentSpec...}, "payload": {...webhook data...} }
    """
    raw_body = await request.body()
    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")

    if "spec" not in body or "payload" not in body:
        raise HTTPException(status_code=422, detail="Body must contain 'spec' and 'payload' keys")

    try:
        spec = AgentSpec(**body["spec"])
        payload = body["payload"]
        result = await handle_webhook(spec, payload, json.dumps(payload).encode(),
                                      x_hub_signature_256 or x_signature)
        return {"content": result.content, "finish_reason": result.finish_reason,
                "iterations": result.iterations}
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
