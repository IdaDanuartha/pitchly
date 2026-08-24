"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/client";

type Mode = "masuk" | "daftar";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.auth;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifySent, setVerifySent] = useState(false);

  const isDaftar = mode === "daftar";

  async function onGoogle() {
    setError(null);
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.detail ?? data.error ?? t.googleUnavailable);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t.googleStartFailed);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    const endpoint = isDaftar ? "/api/auth/register" : "/api/auth/login";

    if (isDaftar) {
      if (payload.password !== payload.konfirmasi_password) {
        setError(t.passwordMismatch);
        setLoading(false);
        return;
      }
      delete payload.konfirmasi_password; // backend doesn't need it
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? dict.common.error);
        return;
      }
      if (isDaftar && data.verified === false) {
        setVerifySent(true);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t.connectFailed);
    } finally {
      setLoading(false);
    }
  }

  if (verifySent) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <Logo />
        <MailCheck
          size={32}
          strokeWidth={1.5}
          className="mt-10 text-growth-teal"
        />
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-navy">
          {t.checkEmailTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-gray">
          {t.checkEmailBody}
        </p>
        <Link
          href="/login"
          className="mt-6 text-sm text-spotlight-amber hover:underline"
        >
          {t.backToSignIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Logo />
      <h1 className="mt-10 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {isDaftar ? t.createTitle : t.signInTitle}
      </h1>
      <p className="mt-2 text-sm text-ink-gray">
        {isDaftar ? t.createSubtitle : t.signInSubtitle}
      </p>

      <button
        onClick={onGoogle}
        className="mt-8 flex w-full items-center justify-center gap-3 border border-ink-navy/20 bg-warm-paper px-4 py-3 text-sm text-ink-navy transition-colors hover:border-ink-navy/50"
      >
        <GoogleMark />
        {isDaftar ? t.googleSignUp : t.googleSignIn}
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-paper-line" />
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
          {t.or}
        </span>
        <span className="h-px flex-1 bg-paper-line" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {isDaftar && (
          <Field name="nama" label={t.nama} type="text" placeholder={t.namaPlaceholder} />
        )}
        <Field name="email" label={t.email} type="email" placeholder={t.emailPlaceholder} />
        <Field
          name="password"
          label={t.password}
          type="password"
          placeholder={t.passwordPlaceholder}
        />
        {isDaftar && (
          <Field
            name="konfirmasi_password"
            label={t.confirmPassword}
            type="password"
            placeholder={t.confirmPasswordPlaceholder}
          />
        )}

        {error && (
          <p className="border-l-2 border-critique-rust bg-critique-rust/8 px-3 py-2 text-sm text-critique-rust">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? dict.common.loading : isDaftar ? t.signUp : t.signIn}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-gray">
        {isDaftar ? t.haveAccount : t.noAccount}
        <Link
          href={isDaftar ? "/login" : "/register"}
          className="text-spotlight-amber hover:underline"
        >
          {isDaftar ? t.signIn : t.signUp}
        </Link>
      </p>
    </div>
  );
}

function Field({
  name,
  label,
  type,
  placeholder,
}: {
  name: string;
  label: string;
  type: string;
  placeholder: string;
}) {
  const isPassword = type === "password";
  const [show, setShow] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
        {label}
      </span>
      <div className="relative">
        <input
          name={name}
          type={isPassword ? (show ? "text" : "password") : type}
          required
          placeholder={placeholder}
          className="w-full border border-ink-navy/20 bg-warm-paper px-3 py-2.5 pr-10 text-sm text-ink-navy placeholder:text-ink-gray/50 focus:border-ink-navy focus:outline-none"
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-gray/50 hover:text-ink-navy"
            aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {show ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        )}
      </div>
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
