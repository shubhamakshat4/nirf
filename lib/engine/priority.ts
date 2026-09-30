import { IND, type Indicator } from "./indicators";
import { CATEGORIES, type EngineConfig, type Values } from "./constants";
import { withDerived } from "./derive";
import { norm } from "./score";

export type Priority = {
  ind: Indicator;
  /** current normalised score 0–100 */
  cur: number;
  /** remaining gap as a fraction 0–1 */
  gap: number;
  /** gap weighted by sub-weight and parameter weight */
  pri: number;
  /** priority divided by effort — score per unit of effort */
  lev: number;
};

export function priorities(values: Values, cfg: EngineConfig): Priority[] {
  const vals = withDerived(values);
  const st = vals.X1 || 0;
  const w = CATEGORIES[cfg.category].w;
  return IND.map((ind) => {
    const cur = norm(ind, vals[ind.id] || 0, st, cfg);
    const gap = (100 - cur) / 100;
    const pri = gap * (ind.w / 100) * w[ind.p] * 100;
    return { ind, cur, gap, pri, lev: pri / ind.eff };
  });
}
