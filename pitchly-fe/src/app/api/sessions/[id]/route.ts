import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { id } = await params;
  const res = await backendFetch(`/sessions/${id}`, {
    method: "DELETE",
    token,
  });
  if (res.status === 204) return new Response(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
