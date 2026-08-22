import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-none px-5 py-3 text-sm font-medium tracking-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotlight-amber disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-spotlight-amber text-warm-paper hover:bg-[#a06a15] border border-spotlight-amber",
  secondary:
    "bg-transparent text-ink-navy border border-ink-navy/25 hover:border-ink-navy/60",
  ghost: "bg-transparent text-ink-navy hover:text-spotlight-amber",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: { variant?: Variant } & ComponentProps<"button">) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  href,
  children,
}: {
  variant?: Variant;
  className?: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
