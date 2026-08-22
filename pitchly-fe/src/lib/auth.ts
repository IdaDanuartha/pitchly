import { cookies } from "next/headers";

import { backendFetch, TOKEN_COOKIE } from "@/lib/api";

export type CurrentUser = {
  id: string;
  nama: string;
  email: string;
  role: string;
  auth_provider?: string;
};

/** Read the JWT from the httpOnly cookie (server-side only). */
export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

/** Fetch the current user from the backend, or null if unauthenticated. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getToken();
  if (!token) return null;
  const res = await backendFetch("/auth/me", { token });
  if (!res.ok) return null;
  return (await res.json()) as CurrentUser;
}
