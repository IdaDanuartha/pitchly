import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const res = await backendFetch(`/sessions/${id}/outcome`, {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const { id } = await ctx.params;
  const res = await backendFetch(`/sessions/${id}/outcome`, { token });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
