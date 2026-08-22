import { cookies } from "next/headers";

import { TOKEN_COOKIE } from "@/lib/api";

export async function POST() {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  return Response.json({ ok: true });
}
