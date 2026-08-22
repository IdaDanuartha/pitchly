import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const body = await req.json();
  const res = await backendFetch("/account/profile", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
