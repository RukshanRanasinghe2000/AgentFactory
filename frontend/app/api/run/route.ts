import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route — forwards /api/run requests to the backend execution engine.
 * Backend URL is server-side only (BACKEND_URL env var).
 * Set BACKEND_URL in your cloud environment config.
 */
export async function POST(req: NextRequest) {
  const backendUrl = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");

  try {
    const body = await req.json();

    const res = await fetch(`${backendUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // 60s timeout for agent execution
      signal: AbortSignal.timeout(60000),
    });

    const data = await res.json().catch(() => ({ detail: `Backend returned ${res.status}` }));

    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("timeout") || msg.includes("abort");
    const isRefused = msg.includes("ECONNREFUSED") || msg.includes("fetch failed");

    let detail = `Backend error: ${msg}`;
    if (isRefused) detail = `Cannot reach backend at ${(process.env.BACKEND_URL || "http://localhost:8080")}. Check BACKEND_URL env var.`;
    if (isTimeout) detail = "Agent execution timed out (60s limit).";

    return NextResponse.json({ detail }, { status: 502 });
  }
}
