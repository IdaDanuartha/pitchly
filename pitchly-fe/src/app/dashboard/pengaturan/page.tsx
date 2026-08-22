import { AccountDanger } from "@/components/dashboard/AccountDanger";
import { EditProfile } from "@/components/dashboard/EditProfile";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n/server";

export default async function PengaturanPage() {
  const user = await getCurrentUser();
  const dict = await getDictionary();

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
        {dict.settings.title}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {dict.settings.heading}
      </h1>

      <div className="mt-8 border-b border-paper-line pb-8">
        <LanguageSwitcher />
      </div>

      <EditProfile
        initialNama={user?.nama ?? ""}
        email={user?.email ?? "—"}
        role={user?.role ?? "—"}
        authProvider={user?.auth_provider ?? "local"}
      />

      <AccountDanger />
    </div>
  );
}
