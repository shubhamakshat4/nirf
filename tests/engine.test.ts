import { describe, expect, it } from "vitest";
import {
  ACCRED,
  BANDS,
  CATEGORIES,
  DERIVED_IDS,
  ENTERABLE,
  IND,
  PACE_K,
  PKEYS,
  SAMPLE,
  SAMPLE_RAW,
  STEADY_PUSH,
  arrivalYear,
  composite,
  defaultConfig,
  isDerived,
  norm,
  paramScores,
  requiredFactor,
  simulate,
  withDerived,
  type BandKey,
  type EngineConfig,
  type IndicatorId,
  type Values,
} from "@/lib/engine";

export const WEAK: Values = {
  X1: 3000, X2: 120, X3: 80, X4: 45, X6: 20, X7: 18, X8: 22, X9: 4, X11: 0.8, X12: 25, X13: 12, X14: 900, X15: 40,
  X16: 40, X17: 25, X18: 10, X19: 6, X20: 150, X22: 12, X23: 2, X24: 0, X25: 1, X26: 3, X27: 0.6, X28: 1, X29: 0.1,
  X30: 20, X31: 3, X32: 1, X33: 4, X34: 0.5, X35: 1, X36: 0, X37: 4,
  X38: 600, X40: 82, X41: 88, X43: 48, X44: 3.2, X45: 3.8, X47: 10, X48: 5, X50: 30, X51: 60, X52: 1,
  X54: 40, X56: 33, X58: 6.7, X59: 2, X60: 0, X61: 400, X62: 700, X63: 8, X64: 0.6, X65: 60, X66: 4,
  X68: 20, X69: 25, X71: 1, X72: 1, X75: 2, X76: 2, X78: 5, X79: 12,
};

const ONLY_X1: Values = { X1: 3000 };

const cfg: EngineConfig = defaultConfig(); // overall, 30/42/55/68/80, peer 1, sizeNorm on, base 2026
const goal = (g: BandKey, extra: Partial<EngineConfig> = {}): EngineConfig => ({ ...cfg, goal: g, ...extra });

const TOL = 0.01;

const near = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOL);

/** Record of computed-vs-expected figures, printed at the end of the run. */
const record: { fixture: string; metric: string; expected: number | null; actual: number | null }[] = [];
const log = (fixture: string, metric: string, expected: number | null, actual: number | null) =>
  record.push({ fixture, metric, expected, actual });

describe("indicator table", () => {
  it("has 79 indicators, 15 derived, 64 enterable", () => {
    expect(IND).toHaveLength(79);
    expect(DERIVED_IDS).toHaveLength(15);
    expect(ENTERABLE).toHaveLength(64);
    expect([...DERIVED_IDS].sort()).toEqual(
      ["X5", "X10", "X21", "X39", "X42", "X46", "X49", "X53", "X55", "X57", "X67", "X70", "X73", "X74", "X77"].sort(),
    );
    for (const id of DERIVED_IDS) expect(IND.find((i) => i.id === id)?.der).toBeTruthy();
    for (const i of ENTERABLE) expect(isDerived(i.id)).toBe(false);
  });

  it("every parameter's sub-weights sum to 100", () => {
    for (const p of PKEYS) {
      const sum = IND.filter((i) => i.p === p).reduce((a, i) => a + i.w, 0);
      expect(sum).toBe(100);
    }
  });

  it("every category's parameter weights sum to 1", () => {
    for (const c of Object.values(CATEGORIES)) {
      const sum = PKEYS.reduce((a, p) => a + c.w[p], 0);
      expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
    }
  });

  it("carries the prototype's constants", () => {
    expect(PACE_K).toBe(0.7);
    expect(BANDS.map((b) => b.t)).toEqual([30, 42, 55, 68, 80]);
    expect(ACCRED.map((a) => a[1])).toEqual([0, 40, 48, 56, 70, 82, 95]);
    expect(Object.keys(SAMPLE_RAW)).toHaveLength(79);
    expect(Object.keys(SAMPLE)).toHaveLength(64);
    for (const k of Object.keys(SAMPLE)) expect(isDerived(k)).toBe(false);
  });
});

describe("derived values", () => {
  it("recompute from their components", () => {
    const v = withDerived(SAMPLE);
    near(v.X5, 6850 / 412);
    near(v.X70, (68 + 71) / 2);
    near(v.X42, (1520 * 82.4) / 100);
    near(v.X10, ((142 + 38) * 100) / 6850);
    near(v.X21, 9650 / 1240);
    near(v.X39, (1520 * 96.6) / 100);
    near(v.X46, (1520 * 16.7) / 100);
    expect(v.X49).toBe(34);
    near(v.X53, (6850 * 40) / 100);
    near(v.X55, (412 * 35.9) / 100);
    near(v.X57, (6850 * 27.6) / 100);
    expect(v.X73).toBe(27);
    expect(v.X74).toBe(19);
    expect(v.X77).toBe(95);
  });

  it("ignores stored derived keys and recomputes instead", () => {
    const v = withDerived({ ...SAMPLE, X5: 999 } as Values);
    near(v.X5, 6850 / 412);
  });

  it("leaves a derived value at zero when its denominator is missing", () => {
    const v = withDerived(ONLY_X1);
    expect(v.X5).toBe(0);
    expect(v.X10).toBe(0);
  });
});

describe("normalisation", () => {
  it("scores 0 for a missing value, inverted indicators included", () => {
    const x5 = IND.find((i) => i.id === "X5")!;
    expect(x5.inv).toBe(1);
    expect(norm(x5, 0, 3000, cfg)).toBe(0);
    const x1 = IND.find((i) => i.id === "X1")!;
    expect(norm(x1, 0, 0, cfg)).toBe(0);
  });

  it("scales perK bounds by max(0.5, students/1000) when sizeNorm is on", () => {
    const x2 = IND.find((i) => i.id === "X2")!; // perK, min 15 max 100
    // 3000 students → k = 3 → bounds 45..300; raw 172.5 sits at the midpoint
    near(norm(x2, 172.5, 3000, cfg), 50);
    // 200 students → k = 0.5 → bounds 7.5..50
    near(norm(x2, 50, 200, cfg), 100);
    // sizeNorm off → raw bounds 15..100
    near(norm(x2, 57.5, 3000, { ...cfg, sizeNorm: false }), 50);
  });

  it("turning sizeNorm off changes the composite", () => {
    const on = composite(SAMPLE, cfg);
    const off = composite(SAMPLE, { ...cfg, sizeNorm: false });
    expect(Math.abs(on - off)).toBeGreaterThan(0.01);
  });

  it("peer ceiling below 1 lowers the ceiling for normal indicators and raises the floor for inverted ones", () => {
    const x1 = IND.find((i) => i.id === "X1")!;
    expect(norm(x1, 15000, 15000, { ...cfg, peer: 0.62 })).toBe(100);
    expect(norm(x1, 1000 + (15000 - 1000) * 0.62, 6000, { ...cfg, peer: 0.62 })).toBeCloseTo(100, 6);
  });
});

describe("composite and parameter scores", () => {
  const cases: { name: string; values: Values; expected: [number, number, number, number, number, number] }[] = [
    { name: "SAMPLE", values: SAMPLE, expected: [46.7236, 49.3478, 38.5432, 51.716, 45.6657, 54.465] },
    { name: "WEAK", values: WEAK, expected: [16.0016, 17.9774, 3.5818, 25.376, 30.7395, 13.8471] },
    { name: "{ X1: 3000 }", values: ONLY_X1, expected: [0.2143, 0.7143, 0, 0, 0, 0] },
  ];

  for (const c of cases) {
    it(`${c.name}: composite and parameter scores match the prototype`, () => {
      const comp = composite(c.values, cfg);
      const ps = paramScores(c.values, cfg);
      log(c.name, "composite", c.expected[0], comp);
      PKEYS.forEach((p, i) => log(c.name, p, c.expected[i + 1], ps[p]));
      near(comp, c.expected[0]);
      near(ps.TLR, c.expected[1]);
      near(ps.RP, c.expected[2]);
      near(ps.GO, c.expected[3]);
      near(ps.OI, c.expected[4]);
      near(ps.PR, c.expected[5]);
    });
  }
});

describe("simulation", () => {
  const cases: {
    name: string;
    values: Values;
    ranked: number | null;
    top100: number | null;
    top50: number | null;
    y5: number;
  }[] = [
    { name: "SAMPLE", values: SAMPLE, ranked: 0, top100: 0, top50: 5, y5: 55.926 },
    { name: "WEAK", values: WEAK, ranked: 7, top100: 12, top50: 19, y5: 26.4852 },
    { name: "{ X1: 3000 }", values: ONLY_X1, ranked: 12, top100: 17, top50: null, y5: 12.852 },
  ];

  for (const c of cases) {
    it(`${c.name}: arrival years and year-5 score match the prototype`, () => {
      const a30 = arrivalYear(c.values, goal("b200"), STEADY_PUSH);
      const a42 = arrivalYear(c.values, goal("b100"), STEADY_PUSH);
      const a55 = arrivalYear(c.values, goal("b50"), STEADY_PUSH);
      const y5 = simulate(c.values, cfg, STEADY_PUSH, 5)[5].score;
      log(c.name, "arrival Ranked(30)", c.ranked, a30);
      log(c.name, "arrival Top100(42)", c.top100, a42);
      log(c.name, "arrival Top50(55)", c.top50, a55);
      log(c.name, "score at year 5", c.y5, y5);
      expect(a30).toBe(c.ranked);
      expect(a42).toBe(c.top100);
      expect(a55).toBe(c.top50);
      near(y5, c.y5);
    });
  }

  it("an indicator with lag L does not move until year L+1", () => {
    const path = simulate(WEAK, cfg, STEADY_PUSH, 4);
    const lagged = IND.filter((i) => !i.der && i.lag >= 1 && i.pace > 0);
    expect(lagged.length).toBeGreaterThan(0);
    for (const ind of lagged) {
      for (let y = 1; y <= ind.lag; y++) {
        expect(path[y].vals[ind.id]).toBe(path[0].vals[ind.id]);
      }
      // moves in year lag+1 (if there is a gap left to close)
      const before = path[ind.lag].vals[ind.id];
      const after = path[ind.lag + 1].vals[ind.id];
      if (norm(ind, before, path[ind.lag].vals.X1, cfg) < 100) expect(after).not.toBe(before);
    }
  });

  it("movement is capped at 35% of the remaining normalised gap", () => {
    // X65: pace 15, lag 0, min 0 max 100
    const path = simulate({ X1: 3000, X65: 90 }, cfg, STEADY_PUSH, 1);
    // n = 90 → allowed min(15*0.7*1, 10*0.35) = 3.5 → 93.5
    near(path[1].vals.X65, 93.5);
  });

  it("push 0 leaves every value where it was", () => {
    const path = simulate(SAMPLE, cfg, { TLR: 0, RP: 0, GO: 0, OI: 0, PR: 0 }, 3);
    for (const p of path) near(p.score, path[0].score);
  });

  it("simulate keeps derived indicators consistent along the path", () => {
    const path = simulate(WEAK, cfg, STEADY_PUSH, 6);
    for (const p of path) {
      near(p.vals.X70, (p.vals.X68 + p.vals.X69) / 2);
      near(p.vals.X42, (p.vals.X38 * p.vals.X43) / 100);
    }
  });
});

describe("requiredFactor", () => {
  it("returns Infinity for Top 10 with WEAK over a 3-year horizon", () => {
    const f = requiredFactor(WEAK, goal("b10", { baseYear: 2026, targetYear: 2029 }), STEADY_PUSH);
    log("WEAK", "requiredFactor b10 / 3y", Infinity, f);
    expect(f).toBe(Infinity);
  });

  it("returns null when the target year is not after the base year", () => {
    expect(requiredFactor(SAMPLE, { ...cfg, targetYear: 2026 }, STEADY_PUSH)).toBeNull();
  });

  it("returns the floor 0.05 when the goal is already met", () => {
    expect(requiredFactor(SAMPLE, goal("b100"), STEADY_PUSH)).toBe(0.05);
  });

  it("finds a factor whose plan just clears the threshold by the target year", () => {
    const c = goal("b50", { targetYear: 2030 });
    const f = requiredFactor(SAMPLE, c, STEADY_PUSH);
    expect(f).not.toBeNull();
    expect(Number.isFinite(f)).toBe(true);
    const T = c.targetYear - c.baseYear;
    const push = { TLR: f!, RP: f!, GO: f!, OI: f!, PR: f! };
    expect(simulate(SAMPLE, c, push, T)[T].score).toBeGreaterThanOrEqual(55);
    const under = { TLR: f! * 0.98, RP: f! * 0.98, GO: f! * 0.98, OI: f! * 0.98, PR: f! * 0.98 };
    expect(simulate(SAMPLE, c, under, T)[T].score).toBeLessThan(55);
  });
});

describe("purity", () => {
  it("does not mutate its inputs", () => {
    const values: Values = { ...WEAK };
    const snapshot = JSON.stringify(values);
    const c = defaultConfig();
    const csnap = JSON.stringify(c);
    composite(values, c);
    simulate(values, c, STEADY_PUSH, 5);
    requiredFactor(values, c, STEADY_PUSH);
    expect(JSON.stringify(values)).toBe(snapshot);
    expect(JSON.stringify(c)).toBe(csnap);
  });

  it("category weights change the composite", () => {
    const a = composite(SAMPLE, cfg);
    const b = composite(SAMPLE, { ...cfg, category: "research" });
    expect(a).not.toBe(b);
  });
});

describe("record of computed vs expected", () => {
  it("prints the table", () => {
    const rows = record.map((r) => ({
      fixture: r.fixture,
      metric: r.metric,
      expected: r.expected === null ? "null" : String(r.expected),
      actual: r.actual === null ? "null" : Number.isFinite(r.actual) ? r.actual.toFixed(4) : String(r.actual),
    }));
    console.table(rows);
    expect(rows.length).toBeGreaterThan(0);
  });
});

// Type-level check: IndicatorId is the closed X1..X79 union.
const _idCheck: IndicatorId = "X79";
void _idCheck;
