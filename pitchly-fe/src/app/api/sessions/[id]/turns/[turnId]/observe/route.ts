import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/sessions/[id]/turns/[turnId]/observe">,
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const { id, turnId } = await ctx.params;
  const formData = await req.formData();
  const res = await backendFetch(`/sessions/${id}/turns/${turnId}/observe`, {
    method: "POST",
    token,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
