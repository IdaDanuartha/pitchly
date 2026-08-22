import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function POST(request: Request) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const body = await request.json();
  const res = await backendFetch("/sessions", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
