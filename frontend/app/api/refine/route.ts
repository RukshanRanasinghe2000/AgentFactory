import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert AI agent architect. Given a user's rough idea for an AI agent, generate a complete, structured agent specification.

Return ONLY a valid JSON object with these exact fields — no markdown, no explanation:

{
  "name": "Short agent name (3-5 words, title case)",
  "description": "One clear sentence describing what the agent does",
  "version": "0.1.0",
  "license": "MIT",
  "role": "A detailed paragraph describing the agent's persona, expertise, and purpose. Start with 'You are...'",
  "instructions": "Detailed step-by-step instructions in markdown format. Use ## headings for major steps, bullet points for sub-steps. Be specific and actionable.",
  "output_format": "json | markdown | plain",
  "json_output_template": "A realistic JSON example showing the exact structure the agent must return. Use descriptive placeholder values like \"<issue title>\" or actual example values. Must be valid JSON.",
  "execution_mode": "sequential | agentic",
  "max_iterations": 5,
  "enforcement": "Key rules the agent must always follow. Be specific.",
  "suggested_tools": ["tool1", "tool2"],
  "suggested_interfaces": ["webchat | consolechat | webhook"],
  "memory_type": "none | short-term | long-term"
}

Rules:
- name: concise and descriptive
- role: at least 3 sentences, professional tone
- instructions: at least 5 detailed steps with sub-bullets
- enforcement: 2-4 hard rules
- output_format: always default to "json" unless the idea explicitly describes a conversational agent (use "plain") or a document/report generator (use "markdown")
- json_output_template: always generate a realistic JSON example that matches what this specific agent would return. Use meaningful placeholder values. Must be valid JSON string.
- execution_mode: agentic if the agent needs to loop/reason, sequential for single-pass tasks
- max_iterations: 5-30 depending on complexity`;

export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json();

    if (!idea?.trim()) {
      return NextResponse.json({ error: "No idea provided" }, { status: 400 });
    }

    // Read config from server-side environment variables
    const provider  = process.env.MODEL_PROVIDER ?? "groq";
    const apiKey    = process.env.MODEL_API_KEY ?? "";
    const model     = process.env.MODEL_NAME ?? "llama-3.3-70b-versatile";
    const baseUrl   = process.env.MODEL_BASE_URL ?? "";

    if (!apiKey.trim()) {
      return NextResponse.json(
        { error: "MODEL_API_KEY is not set in .env" },
        { status: 500 }
      );
    }

    // Resolve endpoint
    const endpoint = baseUrl.trim()
      ? `${baseUrl.replace(/\/$/, "")}/chat/completions`
      : provider === "anthropic"
      ? "https://api.anthropic.com/v1/messages"
      : "https://api.openai.com/v1/chat/completions";

    let responseText: string;

    if (provider === "anthropic") {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Agent idea: ${idea}` }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: res.status });
      }
      const data = await res.json();
      responseText = data.content?.[0]?.text ?? "";
    } else {
      // OpenAI-compatible (OpenAI, Groq, Ollama, custom)
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Agent idea: ${idea}` },
          ],
          temperature: 0.7,
          max_tokens: 2048,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `API error: ${err}` }, { status: res.status });
      }
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content ?? "";
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse JSON from response" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    // Return provider info so the client can display it
    return NextResponse.json({ spec: parsed, provider, model });
  } catch (err) {
    console.error("Refine error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
