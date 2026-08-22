import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/teams/[id]/members/[memberId]">,
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { id, memberId } = await ctx.params;
  const res = await backendFetch(`/teams/${id}/members/${memberId}`, {
    method: "DELETE",
    token,
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
