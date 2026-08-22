// Client-safe billing types + helpers (no server-only imports here).
// Server fetchers live in ./billing.server.

export type Entitlements = {
  sesi_kuota: number | null;
  presentasi: boolean;
  tim: boolean;
  kalibrasi: boolean;
};

export type Billing = {
  plan: string;
  interval: string | null;
  expires_at: string | null;
  entitlements: Entitlements;
  usage: { sesi_dipakai: number; sesi_kuota: number | null };
};

export type Plan = {
  id: string;
  nama: string;
  deskripsi: string;
  harga_bulanan: number;
  harga_tahunan: number;
  fitur: string[];
};

export function formatRupiah(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}
