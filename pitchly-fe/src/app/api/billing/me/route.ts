import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function GET() {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const res = await backendFetch("/billing/me", { token });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
