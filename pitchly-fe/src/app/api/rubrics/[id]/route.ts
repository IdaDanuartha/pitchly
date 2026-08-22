import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/rubrics/[id]">,
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { id } = await ctx.params;
  const res = await backendFetch(`/rubrics/${id}`, { method: "DELETE", token });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
