import { cookies } from "next/headers";

import { backendFetch, TOKEN_COOKIE } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json();
  const res = await backendFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await safeDetail(res);
    return Response.json({ error: detail }, { status: res.status });
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

async function safeDetail(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.detail ?? "Gagal masuk";
  } catch {
    return "Gagal masuk";
  }
}
