import { cookies } from "next/headers";

import { backendFetch, TOKEN_COOKIE } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json();

  const reg = await backendFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!reg.ok) {
    const detail = await safeDetail(reg, "Gagal mendaftar");
    return Response.json({ error: detail }, { status: reg.status });
  }

  const user = await reg.json();

  // Email verification required → do not log in yet.
  if (!user.email_verified) {
    return Response.json({ verified: false });
  }

  // No verification needed → auto-login for convenience.
  const login = await backendFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });
  if (!login.ok) {
    return Response.json({ verified: true, loggedIn: false });
  }
  const { access_token } = await login.json();
  const store = await cookies();
  store.set(TOKEN_COOKIE, access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });
  return Response.json({ verified: true, loggedIn: true });
}

async function safeDetail(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.detail ?? fallback;
  } catch {
    return fallback;
  }
}
