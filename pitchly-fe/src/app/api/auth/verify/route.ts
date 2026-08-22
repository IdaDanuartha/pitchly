import { backendFetch } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json();
  const res = await backendFetch("/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return Response.json(
      { error: data.detail ?? "Verifikasi gagal" },
      { status: res.status },
    );
  }
  return Response.json({ ok: true });
}
