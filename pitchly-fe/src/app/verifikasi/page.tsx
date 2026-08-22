"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/client";

type State = "loading" | "ok" | "error";

export default function VerifikasiPage() {
  const { dict } = useI18n();
  const t = dict.verify;
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("error");
      setMessage(dict.verify.incompleteLink);
      return;
    }
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setState("ok");
        } else {
          setState("error");
          setMessage(data.error ?? dict.verify.failedDefault);
        }
      })
      .catch(() => {
        setState("error");
        setMessage(dict.auth.connectFailed);
      });
  }, [dict]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Logo />
      <div className="mt-10">
        {state === "loading" && (
          <div className="flex items-center gap-3 text-ink-gray">
            <Loader2 size={20} strokeWidth={1.5} className="animate-spin" />
            {t.verifying}
          </div>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 size={32} strokeWidth={1.5} className="text-growth-teal" />
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-navy">
              {t.okTitle}
            </h1>
            <p className="mt-3 text-sm text-ink-gray">{t.okBody}</p>
            <Link
              href="/masuk"
              className="mt-6 inline-block border border-spotlight-amber bg-spotlight-amber px-5 py-3 text-sm font-medium text-warm-paper transition-colors hover:bg-[#a06a15]"
            >
              {dict.auth.signIn}
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle size={32} strokeWidth={1.5} className="text-critique-rust" />
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-navy">
              {t.failTitle}
            </h1>
            <p className="mt-3 text-sm text-ink-gray">{message}</p>
            <Link
              href="/masuk"
              className="mt-6 inline-block text-sm text-spotlight-amber hover:underline"
            >
              {dict.auth.backToSignIn}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
