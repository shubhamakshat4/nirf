import {
  CATEGORIES,
  ENTERABLE,
  IND,
  PKEYS,
  arrivalYear,
  bandName,
  bandOf,
  fmt,
  norm,
  paramScores,
  requiredFactor,
  scaledPush,
  simulate,
  threshold,
  type EngineConfig,
  type Indicator,
  type PathPoint,
  type Push,
  type Values,
} from "@/lib/engine";

export type Move = { ind: Indicator; gain: number; from: number; to: number };
export type YearBlock = { year: number; score: number; band: string; moves: Move[] };

export type Verdict = {
  kind: "unreachable" | "implausible" | "tight" | "ontrack";
  need: number | null;
  arrival: number | null;
};

export type PlanResult = {
  threshold: number;
  T: number;
  push: Push;
  planPush: Push;
  need: number | null;
  arrival: number | null;
  plan: PathPoint[];
  target: PathPoint[];
  verdict: Verdict;
  roadmap: YearBlock[];
  unevidenced: number;
};

/** The whole /plan computation, ported from renderPlan() + buildRoadmap(). */
export function buildPlan(values: Values, cfg: EngineConfig, push: Push, filledIds: ReadonlySet<string>): PlanResult {
  const t = threshold(cfg);
  const T = cfg.targetYear - cfg.baseYear;
  const plan = simulate(values, cfg, push, 20);
  const need = requiredFactor(values, cfg, push);
  const planPush = need !== null && need !== Infinity && need > 1 ? scaledPush(push, need) : push;
  const target = simulate(values, cfg, planPush, 20);
  const arrival = arrivalYear(values, cfg, push);

  let kind: Verdict["kind"] = "ontrack";
  if (need === Infinity) kind = "unreachable";
  else if (need !== null && need > 2) kind = "implausible";
  else if (need !== null && need > 1) kind = "tight";

  const horizon = Math.min(T > 0 ? T : 5, 12);
  const w = CATEGORIES[cfg.category].w;
  const roadmap: YearBlock[] = [];
  for (let y = 1; y <= horizon; y++) {
    const prev = target[y - 1].vals;
    const cur = target[y].vals;
    const st = prev.X1 || 0;
    const moves = IND.filter((i) => !i.der)
      .map((ind) => {
        const a = norm(ind, prev[ind.id] || 0, st, cfg);
        const b = norm(ind, cur[ind.id] || 0, cur.X1 || st, cfg);
        return { ind, gain: (b - a) * (ind.w / 100) * w[ind.p], from: prev[ind.id] || 0, to: cur[ind.id] || 0 };
      })
      .filter((m) => m.gain > 0.012)
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 6);
    const sc = target[y].score;
    roadmap.push({ year: cfg.baseYear + y, score: sc, band: bandOf(sc, cfg.bands), moves });
  }

  const unevidenced = ENTERABLE.filter((i) => !filledIds.has(i.id)).length;

  return { threshold: t, T, push, planPush, need, arrival, plan, target, verdict: { kind, need, arrival }, roadmap, unevidenced };
}

/** Plain-text version of the plan for the copy button. */
export function planAsText(name: string, values: Values, cfg: EngineConfig, res: PlanResult): string {
  const ps = paramScores(values, cfg);
  const lines: string[] = [];
  lines.push(`NIRF readiness plan — ${name}`);
  lines.push(`Category ${CATEGORIES[cfg.category].nm} · base ${cfg.baseYear} · target ${bandName(cfg.goal)} by ${cfg.targetYear}`);
  lines.push(
    `Composite today ${fmt(res.plan[0].score, 1)} / needed ${res.threshold} · arrival at current push: ${res.arrival === null ? "beyond 20 years" : cfg.baseYear + res.arrival}`,
  );
  lines.push("");
  lines.push(PKEYS.map((p) => `${p} ${fmt(ps[p], 1)}`).join("   "));
  lines.push("");
  lines.push(`${cfg.baseYear} — foundation (before any score moves)`);
  lines.push("  • Appoint a NIRF nodal officer with authority over departmental data returns");
  lines.push("  • Reconcile student, faculty and financial counts to a single institutional source");
  lines.push("  • Consolidate Scopus and Web of Science records under one institution identifier");
  lines.push(`  • Evidence the ${res.unevidenced} indicators currently carrying no data`);
  for (const y of res.roadmap) {
    lines.push("");
    lines.push(`${y.year} — checkpoint score ${fmt(y.score, 1)} · ${y.band.toLowerCase()}`);
    if (!y.moves.length) lines.push("  No material movement available this year — lagged indicators are still maturing.");
    for (const m of y.moves) lines.push(`  • ${m.ind.nm}: ${fmt(m.from)} → ${fmt(m.to)} ${m.ind.u} (+${fmt(m.gain, 2)} pts) — ${m.ind.act}`);
  }
  return lines.join("\n");
}
