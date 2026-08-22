import { backendFetch } from "@/lib/api";

export async function GET() {
  const res = await backendFetch("/auth/google/url");
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
