import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export type Rubric = {
  id: string;
  nama_kompetisi: string;
  kriteria_json: string[];
  bobot_json: Record<string, number>;
  created_at: string;
};

export async function fetchRubrics(): Promise<Rubric[]> {
  const token = await getToken();
  const res = await backendFetch("/rubrics", { token });
  if (!res.ok) return [];
  return res.json();
}
