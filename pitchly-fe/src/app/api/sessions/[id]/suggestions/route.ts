import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { id } = await ctx.params;
  const res = await backendFetch(`/sessions/${id}/suggestions`, {
    method: "POST",
    token,
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
