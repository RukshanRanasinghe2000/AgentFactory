import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route — forwards /api/run requests to the backend execution engine.
 * This keeps the backend URL server-side (BACKEND_URL env var, no NEXT_PUBLIC_ needed).
 */
export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";

  try {
    const body = await req.json();

    const res = await fetch(`${backendUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { detail: `Backend unreachable: ${String(err)}` },
      { status: 502 }
    );
  }
}
