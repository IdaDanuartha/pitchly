// Simple server-rendered score trend (PRD §10.I "grafik tren skor sederhana").
// Chronological line of average scores across completed sessions.

export function ScoreTrend({
  scores,
  ariaLabel,
}: {
  scores: number[];
  ariaLabel: string;
}) {
  if (scores.length < 2) return null;

  const w = 640;
  const h = 140;
  const pad = 24;
  const maxX = scores.length - 1;
  const x = (i: number) => pad + (i / maxX) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / 100) * (h - pad * 2);

  const line = scores.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  return (
    <div className="overflow-x-auto border border-paper-line bg-paper-soft p-5">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line
              x1={pad}
              x2={w - pad}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--color-paper-line)"
              strokeWidth={1}
            />
            <text
              x={0}
              y={y(g) + 3}
              className="font-mono"
              fontSize={9}
              fill="var(--color-ink-gray)"
            >
              {g}
            </text>
          </g>
        ))}
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-spotlight-amber)"
          strokeWidth={2}
        />
        {scores.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={3}
            fill="var(--color-spotlight-amber)"
          />
        ))}
      </svg>
    </div>
  );
}
