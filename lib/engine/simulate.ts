import { IND } from "./indicators";
import { PKEYS, type EngineConfig, type Push, type Values } from "./constants";
import { withDerived, type FullValues } from "./derive";
import { bounds, clamp, composite, norm, threshold } from "./score";

/* Global brake on how fast any plan can move. 1.0 would mean an institution
   pushing on all fronts closes roughly 5 composite points a year, which is
   faster than the published record supports. */
export const PACE_K = 0.7;

export type PathPoint = { y: number; vals: FullValues; score: number };

/* One planning year. Movement is set in normalised points per year, braked as
   the indicator approaches the peer ceiling, then converted back to raw units. */
export function step(vals: FullValues, push: Push, year: number, cfg: EngineConfig): FullValues {
  const nv: FullValues = { ...vals };
  const st = vals.X1 || 0;
  for (const ind of IND) {
    if (ind.pace <= 0) continue; // derived — follows its components
    if (year <= ind.lag) continue; // lagged — nothing registers yet
    const [mn, mx] = bounds(ind, st, cfg);
    const n = norm(ind, vals[ind.id] || 0, st, cfg);
    const delta = Math.min(ind.pace * PACE_K * (push[ind.p] || 0), (100 - n) * 0.35);
    const n2 = clamp(n + delta, 0, 100);
    nv[ind.id] = ind.inv ? mx - (n2 / 100) * (mx - mn) : mn + (n2 / 100) * (mx - mn);
  }
  return withDerived(nv);
}

export function simulate(values: Values, cfg: EngineConfig, push: Push, years = 20): PathPoint[] {
  let v = withDerived(values);
  const path: PathPoint[] = [{ y: 0, vals: { ...v }, score: composite(v, cfg) }];
  for (let y = 1; y <= years; y++) {
    v = step(v, push, y, cfg);
    path.push({ y, vals: { ...v }, score: composite(v, cfg) });
  }
  return path;
}

/** Years from base year until the composite clears the goal band, or null if never within the horizon. */
export function arrivalYear(values: Values, cfg: EngineConfig, push: Push, years = 20): number | null {
  const p = simulate(values, cfg, push, years);
  const t = threshold(cfg);
  for (const s of p) if (s.score >= t) return s.y;
  return null;
}

export function scaledPush(push: Push, f: number): Push {
  const o = {} as Push;
  for (const p of PKEYS) o[p] = push[p] * f;
  return o;
}

/** Scalar multiplier on the given push needed to clear the goal by the target
    year. null when the target year is not after the base year; Infinity when
    unreachable even at 6×. */
export function requiredFactor(values: Values, cfg: EngineConfig, push: Push): number | null {
  const T = cfg.targetYear - cfg.baseYear;
  if (T <= 0) return null;
  const t = threshold(cfg);
  const lo0 = 0.05;
  const hi0 = 6;
  if (simulate(values, cfg, scaledPush(push, hi0), T)[T].score < t) return Infinity;
  if (simulate(values, cfg, scaledPush(push, lo0), T)[T].score >= t) return lo0;
  let lo = lo0;
  let hi = hi0;
  for (let i = 0; i < 36; i++) {
    const m = (lo + hi) / 2;
    if (simulate(values, cfg, scaledPush(push, m), T)[T].score >= t) hi = m;
    else lo = m;
  }
  return hi;
}
