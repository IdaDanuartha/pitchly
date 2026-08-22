import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Billing, Plan } from "@/lib/billing";
import { getLocale } from "@/i18n/server";

export async function fetchBilling(): Promise<Billing | null> {
  const token = await getToken();
  if (!token) return null;
  const res = await backendFetch("/billing/me", { token });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPlans(): Promise<Plan[]> {
  const token = await getToken();
  const locale = await getLocale();
  const res = await backendFetch(`/billing/plans?lang=${locale}`, { token });
  if (!res.ok) return [];
  const data = await res.json();
  return data.plans ?? [];
}
