import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export type Member = { id: string; nama: string; peran: string };
export type Team = {
  id: string;
  nama_tim: string;
  owner_id: string;
  members: Member[];
};

export async function fetchTeams(): Promise<Team[]> {
  const token = await getToken();
  const res = await backendFetch("/teams", { token });
  if (!res.ok) return [];
  return res.json();
}
