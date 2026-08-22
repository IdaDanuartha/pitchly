import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/teams/[id]/members">,
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const res = await backendFetch(`/teams/${id}/members`, {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
