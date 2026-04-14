"""
Parses AgentFactory .md spec files into structured Python dicts.
Handles YAML frontmatter + markdown sections (Role, Instructions, etc.)
"""
import re
import yaml
from typing import Any


def parse_md_spec(content: str) -> dict[str, Any]:
    """Parse a full .md agent spec file into a dict."""
    # Normalize line endings
    content = content.replace("\r\n", "\n")

    # Extract YAML frontmatter between first --- and second ---
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not fm_match:
        raise ValueError("No YAML frontmatter found in spec file")

    spec: dict[str, Any] = yaml.safe_load(fm_match.group(1)) or {}
    body = content[fm_match.end():]

    # Split body on --- separators then parse # headings
    segments = re.split(r"\n---+\n", body)
    for segment in segments:
        segment = segment.strip()
        if not segment:
            continue
        # Match a top-level heading
        heading_match = re.match(r"^#\s+(.+?)\n([\s\S]*)", segment)
        if not heading_match:
            continue
        title = heading_match.group(1).strip().lower()
        body_text = heading_match.group(2).strip()

        if title == "role":
            spec["role"] = body_text
        elif title == "instructions":
            spec["instructions"] = body_text
        elif title == "enforcement":
            spec["enforcement"] = body_text
        elif title == "output schema":
            # Extract JSON from fenced block if present
            json_match = re.search(r"```(?:json)?\n([\s\S]*?)```", body_text)
            if json_match:
                spec["json_output_template"] = json_match.group(1).strip()

    return spec


def resolve_env_value(value: str | None) -> str | None:
    """Resolve ${env:VAR_NAME} placeholders from environment variables."""
    import os
    if not value:
        return value
    match = re.match(r"^\$\{env:(.+)\}$", str(value))
    if match:
        return os.getenv(match.group(1), "")
    return value
