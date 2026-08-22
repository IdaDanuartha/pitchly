import { cookies } from "next/headers";

import { backendFetch, TOKEN_COOKIE } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function DELETE() {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const res = await backendFetch("/account", { method: "DELETE", token });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    const store = await cookies();
    store.delete(TOKEN_COOKIE);
  }
  return Response.json(data, { status: res.status });
}
