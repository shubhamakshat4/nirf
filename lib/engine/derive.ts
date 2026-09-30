import { IND, type IndicatorId } from "./indicators";
import type { Values } from "./constants";

/** Every indicator present, zero when missing. This is what the engine computes on. */
export type FullValues = Record<IndicatorId, number>;

type DeriveFn = (v: FullValues) => number | undefined;

/* Indicators computed from others — the source model treats several of these
   as the same underlying data point, so they are never entered twice. */
export const DERIVE: Readonly<Partial<Record<IndicatorId, DeriveFn>>> = {
  X5: (v) => (v.X2 > 0 ? v.X1 / v.X2 : undefined),
  X10: (v) => (v.X1 > 0 ? ((v.X8 + v.X9) * 100) / v.X1 : undefined),
  X21: (v) => (v.X16 > 0 ? v.X20 / v.X16 : undefined),
  X39: (v) => (v.X38 * v.X40) / 100,
  X42: (v) => (v.X38 * v.X43) / 100,
  X46: (v) => (v.X38 * v.X47) / 100,
  X49: (v) => v.X31,
  X53: (v) => (v.X1 * v.X54) / 100,
  X55: (v) => (v.X2 * v.X56) / 100,
  X57: (v) => (v.X1 * v.X58) / 100,
  X67: (v) =>
    (Math.min(v.X54, 50) / 50) * 0.4 +
    (Math.min(v.X58, 50) / 50) * 0.3 +
    (Math.min(v.X1 > 0 ? (v.X62 / v.X1) * 100 : 0, 40) / 40) * 0.3,
  X70: (v) => (v.X68 + v.X69) / 2,
  X73: (v) => v.X33,
  X74: (v) => v.X32,
  X77: (v) => v.X15,
};

export const DERIVED_IDS: readonly IndicatorId[] = Object.keys(DERIVE) as IndicatorId[];

/** Which entered indicators each derived one reads. Used to scope what a
    contributor's browser needs in order to show a live figure for it. */
export const DERIVE_DEPS: Readonly<Partial<Record<IndicatorId, readonly IndicatorId[]>>> = {
  X5: ["X1", "X2"],
  X10: ["X1", "X8", "X9"],
  X21: ["X16", "X20"],
  X39: ["X38", "X40"],
  X42: ["X38", "X43"],
  X46: ["X38", "X47"],
  X49: ["X31"],
  X53: ["X1", "X54"],
  X55: ["X2", "X56"],
  X57: ["X1", "X58"],
  X67: ["X1", "X54", "X58", "X62"],
  X70: ["X68", "X69"],
  X73: ["X33"],
  X74: ["X32"],
  X77: ["X15"],
};

export function isDerived(id: string): id is IndicatorId {
  return id in DERIVE;
}

export function withDerived(raw: Values): FullValues {
  const v = {} as FullValues;
  for (const i of IND) v[i.id] = raw[i.id] || 0;
  for (const id of DERIVED_IDS) {
    const fn = DERIVE[id];
    if (!fn) continue;
    const r = fn(v);
    if (r !== undefined && Number.isFinite(r)) v[id] = r;
  }
  return v;
}

/** Drop derived keys from a value map — the shape that gets stored. */
export function stripDerived(raw: Values): Values {
  const out: Values = {};
  for (const [k, val] of Object.entries(raw)) {
    if (!isDerived(k) && val !== undefined) out[k as IndicatorId] = val;
  }
  return out;
}
