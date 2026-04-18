import { NextRequest, NextResponse } from "next/server";
import { loadPrompt } from "@/lib/loadPrompt";

export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json();

    if (!idea?.trim()) {
      return NextResponse.json({ error: "No idea provided" }, { status: 400 });
    }

    const provider = process.env.MODEL_PROVIDER ?? "groq";
    const apiKey   = process.env.MODEL_API_KEY ?? "";
    const model    = process.env.MODEL_NAME ?? "llama-3.3-70b-versatile";
    const baseUrl  = process.env.MODEL_BASE_URL ?? "";

    if (!apiKey.trim()) {
      return NextResponse.json({ error: "MODEL_API_KEY is not set in .env" }, { status: 500 });
    }

    const systemPrompt = loadPrompt("Clarify Prompt");

    const endpoint = baseUrl.trim()
      ? `${baseUrl.replace(/\/$/, "")}/chat/completions`
      : provider === "anthropic"
      ? "https://api.anthropic.com/v1/messages"
      : provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    let responseText: string;

    if (provider === "anthropic") {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model, max_tokens: 1024, system: systemPrompt,
          messages: [{ role: "user", content: `Agent idea: ${idea}` }],
        }),
      });
      if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
      const data = await res.json();
      responseText = data.content?.[0]?.text ?? "";
    } else {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Agent idea: ${idea}` },
          ],
          temperature: 0.6,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content ?? "";
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse response" }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
