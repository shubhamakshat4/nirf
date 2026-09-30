import type { IndicatorId, Param } from "./indicators";
import { IND } from "./indicators";

export type CategoryKey =
  | "overall"
  | "university"
  | "engineering"
  | "college"
  | "management"
  | "research"
  | "statepublic";

export type BandKey = "b200" | "b100" | "b50" | "b25" | "b10";

export type Values = Partial<Record<IndicatorId, number>>;

export type Push = Record<Param, number>;

export type Bands = Record<BandKey, number>;

/** Everything the engine needs. Pure functions take this instead of a global. */
export type EngineConfig = {
  category: CategoryKey;
  goal: BandKey;
  bands: Bands;
  peer: number; // 1 | 0.8 | 0.62
  sizeNorm: boolean;
  baseYear: number;
  targetYear: number;
};

export const PARAM_NAMES: Readonly<Record<Param, string>> = {
  TLR: "Teaching, Learning & Resources",
  RP: "Research & Professional Practice",
  GO: "Graduation Outcomes",
  OI: "Outreach & Inclusivity",
  PR: "Perception",
};

export const PKEYS: readonly Param[] = ["TLR", "RP", "GO", "OI", "PR"];

export function isParam(x: string): x is Param {
  return (PKEYS as readonly string[]).includes(x);
}

export const CATEGORIES: Readonly<Record<CategoryKey, { nm: string; w: Record<Param, number> }>> = {
  overall: { nm: "Overall", w: { TLR: 0.3, RP: 0.3, GO: 0.2, OI: 0.1, PR: 0.1 } },
  university: { nm: "University", w: { TLR: 0.3, RP: 0.3, GO: 0.2, OI: 0.1, PR: 0.1 } },
  engineering: { nm: "Engineering", w: { TLR: 0.3, RP: 0.3, GO: 0.2, OI: 0.1, PR: 0.1 } },
  management: { nm: "Management", w: { TLR: 0.3, RP: 0.3, GO: 0.2, OI: 0.1, PR: 0.1 } },
  college: { nm: "College", w: { TLR: 0.3, RP: 0.2, GO: 0.25, OI: 0.15, PR: 0.1 } },
  research: { nm: "Research Institutions", w: { TLR: 0.25, RP: 0.4, GO: 0.15, OI: 0.1, PR: 0.1 } },
  statepublic: { nm: "State Public Universities", w: { TLR: 0.3, RP: 0.25, GO: 0.2, OI: 0.15, PR: 0.1 } },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export function isCategoryKey(x: string): x is CategoryKey {
  return x in CATEGORIES;
}

export const BANDS: readonly { k: BandKey; nm: string; t: number }[] = [
  { k: "b200", nm: "Ranked (101–200 band)", t: 30 },
  { k: "b100", nm: "Top 100", t: 42 },
  { k: "b50", nm: "Top 50", t: 55 },
  { k: "b25", nm: "Top 25", t: 68 },
  { k: "b10", nm: "Top 10", t: 80 },
];

export const BAND_KEYS: readonly BandKey[] = BANDS.map((b) => b.k);

export function isBandKey(x: string): x is BandKey {
  return (BAND_KEYS as readonly string[]).includes(x);
}

export const DEFAULT_BANDS: Bands = Object.fromEntries(BANDS.map((b) => [b.k, b.t])) as Bands;

export function bandName(k: BandKey): string {
  return BANDS.find((b) => b.k === k)?.nm ?? k;
}

export const ACCRED: readonly (readonly [string, number])[] = [
  ["Not accredited", 0],
  ["NAAC B", 40],
  ["NAAC B+", 48],
  ["NAAC B++", 56],
  ["NAAC A", 70],
  ["NAAC A+", 82],
  ["NAAC A++", 95],
];

export const PEER_OPTIONS: readonly { v: number; nm: string }[] = [
  { v: 1, nm: "Top-25 national performance" },
  { v: 0.8, nm: "Top-100 national performance" },
  { v: 0.62, nm: "Regional leader" },
];

/** Steady push on every parameter — the default planning assumption. */
export const STEADY_PUSH: Push = { TLR: 1, RP: 1, GO: 1, OI: 1, PR: 1 };

export const PUSH_PRESETS: Readonly<Record<string, { nm: string; push: Push }>> = {
  hold: { nm: "Hold steady", push: { TLR: 0.4, RP: 0.4, GO: 0.4, OI: 0.4, PR: 0.4 } },
  balanced: { nm: "Balanced push", push: { TLR: 1.2, RP: 1.2, GO: 1.2, OI: 1.2, PR: 1 } },
  research: { nm: "Research-first", push: { TLR: 1, RP: 2.2, GO: 0.8, OI: 0.6, PR: 1.2 } },
  outcomes: { nm: "Outcomes-first", push: { TLR: 1.2, RP: 0.8, GO: 2.2, OI: 1.4, PR: 1 } },
  max: { nm: "Everything at once", push: { TLR: 2.2, RP: 2.2, GO: 2.2, OI: 2.2, PR: 2.2 } },
};

export const PUSH_LABELS: readonly (readonly [number, string])[] = [
  [0, "Hold"],
  [0.5, "Light"],
  [1, "Steady"],
  [1.6, "Focused"],
  [2.2, "Aggressive"],
];

export function pushLabel(v: number): string {
  let best = PUSH_LABELS[0];
  for (const p of PUSH_LABELS) if (v >= p[0]) best = p;
  return best[1];
}

/** The prototype's sample university, including its derived keys. */
export const SAMPLE_RAW: Readonly<Record<IndicatorId, number>> = {
  X1: 6850, X2: 412, X3: 365, X4: 298, X5: 16.6, X6: 180, X7: 48, X8: 142, X9: 38, X10: 2.63, X11: 9.4, X12: 120, X13: 62, X14: 1850, X15: 95,
  X16: 1240, X17: 980, X18: 710, X19: 460, X20: 9650, X21: 7.78, X22: 42, X23: 56, X24: 21, X25: 14, X26: 38, X27: 22.5, X28: 17, X29: 3.1, X30: 215, X31: 34, X32: 19, X33: 27, X34: 18, X35: 12, X36: 5, X37: 310,
  X38: 1520, X39: 1468, X40: 96.6, X41: 94.2, X42: 1120, X43: 82.4, X44: 7.2, X45: 8.6, X46: 245, X47: 16.7, X48: 58, X49: 34, X50: 89, X51: 310, X52: 9,
  X53: 2740, X54: 40, X55: 148, X56: 35.9, X57: 1890, X58: 27.6, X59: 62, X60: 5, X61: 980, X62: 1340, X63: 74, X64: 4.8, X65: 100, X66: 12, X67: 0.71,
  X68: 68, X69: 71, X70: 69.5, X71: 8, X72: 6, X73: 27, X74: 19, X75: 11, X76: 14, X77: 95, X78: 42, X79: 35,
};

/** SAMPLE_RAW with the 15 derived keys stripped — what a department would enter. */
export const SAMPLE: Values = Object.fromEntries(
  Object.entries(SAMPLE_RAW).filter(([k]) => !IND.find((i) => i.id === k)?.der),
) as Values;

export function defaultConfig(overrides: Partial<EngineConfig> = {}): EngineConfig {
  return {
    category: "overall",
    goal: "b100",
    bands: { ...DEFAULT_BANDS },
    peer: 1,
    sizeNorm: true,
    baseYear: 2026,
    targetYear: 2031,
    ...overrides,
  };
}
