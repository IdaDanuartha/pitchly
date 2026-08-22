import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function POST(request: Request) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const formData = await request.formData();
  const res = await backendFetch("/transcribe", {
    method: "POST",
    token,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
