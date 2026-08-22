import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export type SessionListItem = {
  id: string;
  document_filename: string | null;
  nama_kompetisi: string;
  mode: string;
  status: string;
  skor_rata_rata: number | null;
  created_at: string;
};

export type Overview = {
  total_sesi: number;
  sesi_selesai: number;
  skor_terakhir: number | null;
  dokumen_dianalisis: number;
};

export async function fetchOverview(): Promise<Overview> {
  const token = await getToken();
  const res = await backendFetch("/sessions/overview", { token });
  if (!res.ok)
    return { total_sesi: 0, sesi_selesai: 0, skor_terakhir: null, dokumen_dianalisis: 0 };
  return res.json();
}

export async function fetchSessions(): Promise<SessionListItem[]> {
  const token = await getToken();
  const res = await backendFetch("/sessions", { token });
  if (!res.ok) return [];
  return res.json();
}

export type InsightKategori = {
  nama: string;
  rata: number;
  sesi_lemah: number;
  total_sesi: number;
};

export type Insights = {
  cukup_data: boolean;
  total_sesi_dinilai: number;
  kategori: InsightKategori[];
};

export async function fetchInsights(): Promise<Insights> {
  const token = await getToken();
  const res = await backendFetch("/sessions/insights", { token });
  if (!res.ok) return { cukup_data: false, total_sesi_dinilai: 0, kategori: [] };
  return res.json();
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  active: "Berlangsung",
  menunggu_scorecard: "Menunggu scorecard",
  selesai: "Selesai",
};

/** Where to send the user when they open a session. */
export function sessionHref(s: { id: string; status: string }): string {
  return s.status === "selesai" ? `/session/${s.id}/scorecard` : `/session/${s.id}`;
}

export function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
