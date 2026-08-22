import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function POST(request: Request) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const body = await request.json();
  const res = await backendFetch("/tts", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Suara tidak tersedia" }));
    return Response.json(data, { status: res.status });
  }

  // Stream the mp3 bytes straight through.
  const audio = await res.arrayBuffer();
  return new Response(audio, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg" },
  });
}
