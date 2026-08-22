import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/sessions/[id]/next">,
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const { id } = await ctx.params;
  const res = await backendFetch(`/sessions/${id}/next`, { token });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
