import { PERSONA_META } from "@/components/session/personaMeta";

// 2D SVG judge face. The mouth opens with `amplitude` (0..1) for lip-sync.
export function JudgeAvatar({
  persona,
  amplitude,
  speaking,
  size = 120,
}: {
  persona: string;
  amplitude: number;
  speaking: boolean;
  size?: number;
}) {
  const Icon = PERSONA_META[persona]?.icon;
  const ring = speaking ? "var(--color-spotlight-amber)" : "var(--color-navy-line)";
  // Mouth height: 2px (closed) → ~22px (wide open).
  const mouthH = 2 + Math.max(0, Math.min(1, amplitude)) * 20;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={PERSONA_META[persona]?.label ?? persona}
    >
      {/* Head */}
      <circle cx="60" cy="60" r="52" fill="var(--color-navy-soft)" stroke={ring} strokeWidth="2" />
      {/* Eyes */}
      <circle cx="44" cy="50" r="4" fill="var(--color-warm-paper)" opacity="0.85" />
      <circle cx="76" cy="50" r="4" fill="var(--color-warm-paper)" opacity="0.85" />
      {/* Brow — slight critical furrow */}
      <line x1="36" y1="40" x2="50" y2="43" stroke="var(--color-warm-paper)" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
      <line x1="84" y1="40" x2="70" y2="43" stroke="var(--color-warm-paper)" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
      {/* Mouth — animated */}
      <rect
        x={48}
        y={74 - mouthH / 2}
        width={24}
        height={mouthH}
        rx={Math.min(6, mouthH / 2)}
        fill={speaking ? "var(--color-spotlight-amber)" : "var(--color-warm-paper)"}
        opacity={speaking ? 0.95 : 0.6}
      />
      {/* Persona icon badge */}
      {Icon && (
        <g transform="translate(84,84)">
          <circle r="16" fill="var(--color-ink-navy)" stroke={ring} strokeWidth="1.5" />
          <foreignObject x="-10" y="-10" width="20" height="20">
            <div style={{ color: speaking ? "#B87A1E" : "#F7F4EE", lineHeight: 0 }}>
              <Icon size={20} strokeWidth={1.5} />
            </div>
          </foreignObject>
        </g>
      )}
    </svg>
  );
}
