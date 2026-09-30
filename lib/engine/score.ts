import { IND, type Indicator, type Param } from "./indicators";
import { CATEGORIES, PKEYS, type EngineConfig, type Values } from "./constants";
import { withDerived } from "./derive";

export const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

export type ScoreConfig = Pick<EngineConfig, "peer" | "sizeNorm">;

/** Peer-band floor and ceiling for one indicator, size- and peer-adjusted. */
export function bounds(ind: Indicator, students: number, cfg: ScoreConfig): [number, number] {
  let mn = ind.min;
  let mx = ind.max;
  if (ind.perK && cfg.sizeNorm) {
    const k = Math.max(0.5, (students || 1000) / 1000);
    mn *= k;
    mx *= k;
  }
  if (!ind.inv && cfg.peer < 1) mx = mn + (mx - mn) * cfg.peer;
  if (ind.inv && cfg.peer < 1) mn = mx - (mx - mn) * cfg.peer;
  return [mn, mx];
}

/** 0–100 normalised score. No data is no score, inverted indicators included. */
export function norm(ind: Indicator, raw: number, students: number, cfg: ScoreConfig): number {
  if (!raw) return 0;
  const [mn, mx] = bounds(ind, students, cfg);
  if (mx === mn) return 0;
  const v = ind.inv ? (mx - raw) / (mx - mn) : (raw - mn) / (mx - mn);
  return clamp(v, 0, 1) * 100;
}

export function paramScores(raw: Values, cfg: ScoreConfig): Record<Param, number> {
  const vals = withDerived(raw);
  const st = vals.X1 || 0;
  const out = {} as Record<Param, number>;
  for (const p of PKEYS) {
    let s = 0;
    for (const ind of IND) if (ind.p === p) s += (ind.w / 100) * norm(ind, vals[ind.id] || 0, st, cfg);
    out[p] = s;
  }
  return out;
}

export function composite(raw: Values, cfg: EngineConfig): number {
  const ps = paramScores(raw, cfg);
  const w = CATEGORIES[cfg.category].w;
  return PKEYS.reduce((a, p) => a + w[p] * ps[p], 0);
}

export function threshold(cfg: EngineConfig): number {
  return cfg.bands[cfg.goal];
}
