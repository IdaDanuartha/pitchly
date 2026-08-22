import { cookies } from "next/headers";

import { backendFetch, TOKEN_COOKIE } from "@/lib/api";

export async function POST(request: Request) {
  const { code } = await request.json();
  if (!code) return Response.json({ error: "Kode tidak ada" }, { status: 400 });

  const res = await backendFetch("/auth/google/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return Response.json(
      { error: data.detail ?? "Login Google gagal" },
      { status: res.status },
    );
  }

  const { access_token } = await res.json();
  const store = await cookies();
  store.set(TOKEN_COOKIE, access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });
  return Response.json({ ok: true });
}
