"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, XCircle } from "lucide-react";

import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/client";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.googleCallback;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const err = params.get("error");
    if (err || !code) {
      setError(dict.googleCallback.cancelled);
      return;
    }
    fetch("/api/auth/google/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setError(data.error ?? dict.googleCallback.failedDefault);
        }
      })
      .catch(() => setError(dict.auth.connectFailed));
  }, [router, dict]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Logo />
      <div className="mt-10">
        {error ? (
          <>
            <XCircle size={32} strokeWidth={1.5} className="text-critique-rust" />
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-navy">
              {t.failTitle}
            </h1>
            <p className="mt-3 text-sm text-ink-gray">{error}</p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm text-spotlight-amber hover:underline"
            >
              {dict.auth.backToSignIn}
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-3 text-ink-gray">
            <Loader2 size={20} strokeWidth={1.5} className="animate-spin" />
            {t.finishing}
          </div>
        )}
      </div>
    </div>
  );
}
