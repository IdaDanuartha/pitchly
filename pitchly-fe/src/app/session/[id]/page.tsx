import { redirect } from "next/navigation";

import { LiveSession } from "@/components/session/LiveSession";
import { backendFetch } from "@/lib/api";
import { getCurrentUser, getToken } from "@/lib/auth";

export default async function SesiPage({
  params,
  searchParams,
}: PageProps<"/session/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const token = await getToken();
  const res = await backendFetch(`/sessions/${id}`, { token });
  if (!res.ok) redirect("/dashboard");

  const sess = await res.json();
  if (sess.status === "selesai") redirect(`/session/${id}/scorecard`);

  return (
    <LiveSession
      sessionId={sess.id}
      personaOrder={sess.persona_order}
      durasiMenit={sess.durasi_menit}
      sisaDetik={sess.sisa_detik}
      initialTurns={sess.turns}
      gaya={sess.gaya}
      outputLanguage={sess.output_language ?? "id"}
      initialVoice={sp.voice === "1"}
      denganPresentasi={sess.dengan_presentasi}
      durasiPresentasiMenit={sess.durasi_presentasi_menit}
      presentasiSelesai={sess.presentasi_selesai}
    />
  );
}
