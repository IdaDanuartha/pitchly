import Image from "next/image";
import Link from "next/link";

export function Logo({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  const color = tone === "paper" ? "text-warm-paper" : "text-ink-navy";
  // Light logo on dark backgrounds (tone "paper"), dark logo on light ones.
  const logoSrc =
    tone === "paper"
      ? "/images/logo/pitchly_logo_light.png"
      : "/images/logo/pitchly_logo.png";
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 ${color}`}>
      <Image
        src={logoSrc}
        alt="Pitchly"
        width={1408}
        height={768}
        priority
        className="h-8 w-auto transition-transform group-hover:scale-105"
      />
      <span className="font-display text-2xl font-semibold tracking-tight">
        Pitchly
      </span>
    </Link>
  );
}
