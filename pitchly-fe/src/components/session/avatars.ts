// Portrait image per persona (PNG/JPG URL or /public path). Use any character
// image — AI-generated or illustrated. When empty, the live session falls back
// to the 2D SVG avatar. Inlined at build time (NEXT_PUBLIC_*).

// Bundled default character portraits (shown out of the box). Override any of
// them with your own image via the NEXT_PUBLIC_AVATAR_* env vars.
const DEFAULTS: Record<string, string> = {
  teknis: "/images/avatars/juri-teknis.svg",
  dampak: "/images/avatars/juri-dampak.svg",
  skeptis: "/images/avatars/juri-skeptis.svg",
};

export const AVATAR_IMAGES: Record<string, string> = {
  teknis: process.env.NEXT_PUBLIC_AVATAR_TEKNIS || DEFAULTS.teknis,
  dampak: process.env.NEXT_PUBLIC_AVATAR_DAMPAK || DEFAULTS.dampak,
  skeptis: process.env.NEXT_PUBLIC_AVATAR_SKEPTIS || DEFAULTS.skeptis,
};

export function avatarImage(persona: string): string {
  return AVATAR_IMAGES[persona] ?? "";
}
