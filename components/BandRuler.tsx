import { BANDS, bandName, clamp, fmt, type BandKey, type Bands } from "@/lib/engine";

export type BandRulerProps = {
  /** composite today; omit to draw thresholds only (roles that may not see scores) */
  now?: number;
  /** projected composite in the target year */
  proj?: number;
  bands: Bands;
  goal: BandKey;
  targetYear: number;
};

/**
 * The band ruler — hand-written SVG, ported from the prototype's drawRuler().
 * Segments are the rank bands, ochre is the target threshold, the ink triangle
 * is today and the ring is the projection at steady push.
 */
export function BandRuler({ now, proj, bands, goal, targetYear }: BandRulerProps) {
  const W = 900;
  const L = 54;
  const R = W - 24;
  const y = 56;
  const x = (v: number) => L + ((R - L) * clamp(v, 0, 100)) / 100;
  const segs = [
    { a: 0, b: bands.b200, l: "unranked" },
    { a: bands.b200, b: bands.b100, l: "101–200" },
    { a: bands.b100, b: bands.b50, l: "top 100" },
    { a: bands.b50, b: bands.b25, l: "top 50" },
    { a: bands.b25, b: bands.b10, l: "top 25" },
    { a: bands.b10, b: 100, l: "top 10" },
  ];
  const t = bands[goal];
  const hasNow = now !== undefined;
  const hasProj = hasNow && proj !== undefined && proj > now + 0.2;
  const label = hasNow
    ? `Readiness score ${fmt(now, 1)} against rank bands; target ${bandName(goal)} at ${t}`
    : `Rank bands with target ${bandName(goal)} at ${t}`;

  return (
    <svg className="ruler" viewBox={`0 0 ${W} 92`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
      <g fontFamily="IBM Plex Sans, sans-serif">
        <line x1={L} y1={y} x2={R} y2={y} stroke="var(--line)" strokeWidth={1} />
        {segs.map((sg, i) => {
          const op = 0.1 + i * 0.12;
          const mid = (x(sg.a) + x(sg.b)) / 2;
          return (
            <g key={sg.l}>
              <rect x={x(sg.a)} y={y - 9} width={Math.max(0, x(sg.b) - x(sg.a))} height={18} fill="var(--seal)" opacity={op} />
              {x(sg.b) - x(sg.a) > 52 && (
                <text x={mid} y={y + 26} fontSize={11} fill="var(--muted)" textAnchor="middle">
                  {sg.l}
                </text>
              )}
              <line x1={x(sg.b)} y1={y - 11} x2={x(sg.b)} y2={y + 11} stroke="var(--line)" />
              {sg.b < 100 && (
                <text x={x(sg.b)} y={y + 40} fontSize={10} fill="var(--muted)" textAnchor="middle">
                  {sg.b}
                </text>
              )}
            </g>
          );
        })}
        {/* target threshold */}
        <line x1={x(t)} y1={y - 22} x2={x(t)} y2={y + 14} stroke="var(--ochre)" strokeWidth={2} />
        <text x={x(t)} y={y - 27} fontSize={11} fill="var(--ochre)" textAnchor="middle">
          target {bandName(goal).toLowerCase()}
        </text>
        {/* journey span */}
        {hasProj && <rect x={x(now)} y={y - 3} width={x(proj) - x(now)} height={6} fill="var(--seal)" opacity={0.35} />}
        {/* projected marker */}
        {hasProj && (
          <>
            <circle cx={x(proj)} cy={y} r={6} fill="var(--panel)" stroke="var(--seal)" strokeWidth={2} />
            <text x={x(proj)} y={y + 58} fontSize={11.5} fill="var(--seal)" textAnchor="middle">
              {fmt(proj, 1)} in {targetYear}
            </text>
          </>
        )}
        {/* now marker */}
        {hasNow && (
          <>
            <path d={`M ${x(now)} ${y - 8} l 7 -12 l -14 0 z`} fill="var(--ink)" />
            <line x1={x(now)} y1={y - 8} x2={x(now)} y2={y + 8} stroke="var(--ink)" strokeWidth={2} />
          </>
        )}
        <text x={L - 8} y={y + 4} fontSize={11} fill="var(--muted)" textAnchor="end">
          score
        </text>
      </g>
    </svg>
  );
}

export { BANDS };
