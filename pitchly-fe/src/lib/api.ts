// Server-side base URL for the FastAPI backend. In Docker this is the compose
// service name; locally it defaults to localhost. Never exposed to the client.
export const BACKEND_URL =
  process.env.BACKEND_URL ?? "http://localhost:8000";

export const TOKEN_COOKIE = "pitchly_token";

type FetchOpts = RequestInit & { token?: string | null };

/** Thin fetch wrapper that targets the backend and attaches a Bearer token. */
export async function backendFetch(
  path: string,
  { token, headers, ...init }: FetchOpts = {},
): Promise<Response> {
  const finalHeaders = new Headers(headers);
  if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: finalHeaders,
    cache: "no-store",
  });
}
