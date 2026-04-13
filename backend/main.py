"""
AgentFactory Execution Engine
Reads .md agent specs and runs them against LLM providers.
"""
import os
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from models import AgentSpec, RunRequest, RunFileRequest, RunResponse, ChatMessage
from spec_parser import parse_md_spec
from executor import run_agent

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

AGENTS_DIR = Path(__file__).parent.parent / "factory_agent"


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "AgentFactory Execution Engine",
        "version": "0.1.0",
    }


# ── Run from spec object ──────────────────────────────────────────────────────

@app.post("/run", response_model=RunResponse)
async def run_from_spec(request: RunRequest):
    """Run an agent from a pre-parsed AgentSpec object."""
    try:
        return await run_agent(request.spec, request.user_input, request.history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Run from .md file path ────────────────────────────────────────────────────

@app.post("/run/file", response_model=RunResponse)
async def run_from_file(request: RunFileRequest):
    """Run an agent by reading a .md spec file from disk."""
    file_path = Path(request.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

    try:
        content = file_path.read_text(encoding="utf-8")
        spec_dict = parse_md_spec(content)
        spec = AgentSpec(**spec_dict)
        return await run_agent(spec, request.user_input, request.history)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Spec parse error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Run by agent name (looks in factory_agent/) ───────────────────────────────

class NamedRunRequest(BaseModel):
    user_input: str
    history: list[ChatMessage] = []


@app.post("/run/{agent_name}", response_model=RunResponse)
async def run_named_agent(agent_name: str, request: NamedRunRequest):
    """Run a named agent from the factory_agent/ directory."""
    file_path = AGENTS_DIR / f"{agent_name}.md"
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{agent_name}' not found in factory_agent/",
        )

    try:
        content = file_path.read_text(encoding="utf-8")
        spec_dict = parse_md_spec(content)
        spec = AgentSpec(**spec_dict)
        return await run_agent(spec, request.user_input, request.history)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Spec parse error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Upload and run a .md file ─────────────────────────────────────────────────

@app.post("/run/upload", response_model=RunResponse)
async def run_uploaded_spec(
    file: UploadFile = File(...),
    user_input: str = "Hello",
):
    """Upload a .md spec file and run it immediately."""
    if not file.filename or not file.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="File must be a .md spec file")

    try:
        content = (await file.read()).decode("utf-8")
        spec_dict = parse_md_spec(content)
        spec = AgentSpec(**spec_dict)
        return await run_agent(spec, user_input, [])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Spec parse error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Parse a .md file (no execution) ──────────────────────────────────────────

@app.post("/parse")
async def parse_spec(file: UploadFile = File(...)):
    """Parse a .md spec file and return the structured spec — no execution."""
    if not file.filename or not file.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="File must be a .md spec file")

    try:
        content = (await file.read()).decode("utf-8")
        spec_dict = parse_md_spec(content)
        return {"spec": spec_dict}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# ── List available agents ─────────────────────────────────────────────────────

@app.get("/agents")
async def list_agents():
    """List all .md agent specs in the factory_agent/ directory."""
    if not AGENTS_DIR.exists():
        return {"agents": []}

    agents = []
    for md_file in sorted(AGENTS_DIR.glob("*.md")):
        try:
            content = md_file.read_text(encoding="utf-8")
            spec_dict = parse_md_spec(content)
            agents.append({
                "name": md_file.stem,
                "file": md_file.name,
                "spec_name": spec_dict.get("name", md_file.stem),
                "description": spec_dict.get("description", ""),
                "version": spec_dict.get("version", ""),
                "model": spec_dict.get("model", {}).get("name", ""),
            })
        except Exception:
            agents.append({"name": md_file.stem, "file": md_file.name, "error": "parse failed"})

    return {"agents": agents}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
