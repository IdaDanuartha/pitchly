"use client";

import { useState } from "react";
import { Plus, Trash2, UserPlus, Users } from "lucide-react";

import type { Team } from "@/lib/teams";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useI18n } from "@/i18n/client";

export function TeamManager({ initialTeams }: { initialTeams: Team[] }) {
  const { dict } = useI18n();
  const t = dict.teams;
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [namaTim, setNamaTim] = useState("");
  const [creating, setCreating] = useState(false);
  const [targetTeam, setTargetTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!namaTim.trim()) return;
    setCreating(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama_tim: namaTim.trim() }),
    });
    if (res.ok) {
      const team = await res.json();
      setTeams((prev) => [team, ...prev]);
      setNamaTim("");
    }
    setCreating(false);
  }

  function replaceTeam(updated: Team) {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function confirmDeleteTeam() {
    if (!targetTeam) return;
    setDeletingTeam(true);
    const res = await fetch(`/api/teams/${targetTeam.id}`, { method: "DELETE" });
    if (res.ok) {
      setTeams((prev) => prev.filter((t) => t.id !== targetTeam.id));
    }
    setDeletingTeam(false);
    setTargetTeam(null);
  }

  return (
    <>
      <form onSubmit={createTeam} className="flex gap-3">
        <input
          value={namaTim}
          onChange={(e) => setNamaTim(e.target.value)}
          placeholder={t.newTeamPlaceholder}
          className="flex-1 border border-ink-navy/20 bg-warm-paper px-3 py-2.5 text-sm text-ink-navy placeholder:text-ink-gray/50 focus:border-ink-navy focus:outline-none"
        />
        <Button type="submit" disabled={creating}>
          <Plus size={16} strokeWidth={1.5} />
          {t.createTeam}
        </Button>
      </form>

      {teams.length === 0 ? (
        <p className="mt-8 border border-paper-line bg-paper-soft p-6 text-sm text-ink-gray">
          {t.empty}
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onChange={replaceTeam}
              onPromptDelete={() => setTargetTeam(team)}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={targetTeam !== null}
        title={t.deleteTitle}
        message={`${t.deleteMessageA} "${targetTeam?.nama_tim ?? ""}" ${t.deleteMessageB}`}
        confirmLabel={t.deleteConfirm}
        tone="danger"
        loading={deletingTeam}
        onConfirm={confirmDeleteTeam}
        onCancel={() => !deletingTeam && setTargetTeam(null)}
      />
    </>
  );
}

function TeamCard({
  team,
  onChange,
  onPromptDelete,
}: {
  team: Team;
  onChange: (t: Team) => void;
  onPromptDelete: () => void;
}) {
  const { dict } = useI18n();
  const t = dict.teams;
  const [nama, setNama] = useState("");
  const [peran, setPeran] = useState("");
  const [busy, setBusy] = useState(false);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !peran.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/teams/${team.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: nama.trim(), peran: peran.trim() }),
    });
    if (res.ok) {
      onChange(await res.json());
      setNama("");
      setPeran("");
    }
    setBusy(false);
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) onChange(await res.json());
  }

  return (
    <div className="border border-paper-line bg-paper-soft p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users size={20} strokeWidth={1.5} className="text-ink-navy" />
          <h2 className="font-display text-lg font-semibold text-ink-navy">
            {team.nama_tim}
          </h2>
          <span className="font-mono text-xs text-ink-gray">
            ({team.members.length} {t.members})
          </span>
        </div>
        <button
          onClick={onPromptDelete}
          className="inline-flex items-center gap-1.5 text-xs text-ink-gray transition-colors hover:text-critique-rust"
          aria-label={`${t.deleteTeam} ${team.nama_tim}`}
          title={t.deleteTeam}
        >
          <Trash2 size={16} strokeWidth={1.5} />
          <span className="hidden sm:inline">{t.deleteTeam}</span>
        </button>
      </div>

      {team.members.length > 0 && (
        <ul className="mt-4 divide-y divide-paper-line border-y border-paper-line">
          {team.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2.5">
              <div>
                <span className="text-sm text-ink-navy">{m.nama}</span>
                <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
                  {m.peran}
                </span>
              </div>
              <button
                onClick={() => removeMember(m.id)}
                className="text-ink-gray transition-colors hover:text-critique-rust"
                aria-label={`Hapus ${m.nama}`}
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addMember} className="mt-4 flex flex-wrap gap-2">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder={t.memberNamePlaceholder}
          className="min-w-[140px] flex-1 border border-ink-navy/20 bg-warm-paper px-3 py-2 text-sm text-ink-navy placeholder:text-ink-gray/50 focus:border-ink-navy focus:outline-none"
        />
        <input
          value={peran}
          onChange={(e) => setPeran(e.target.value)}
          placeholder={t.memberRolePlaceholder}
          className="min-w-[140px] flex-1 border border-ink-navy/20 bg-warm-paper px-3 py-2 text-sm text-ink-navy placeholder:text-ink-gray/50 focus:border-ink-navy focus:outline-none"
        />
        <Button type="submit" variant="secondary" disabled={busy}>
          <UserPlus size={16} strokeWidth={1.5} />
          {t.addMember}
        </Button>
      </form>
    </div>
  );
}
