import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/db/context";
import { can } from "@/lib/auth/can";
import { getScenario, listScenarios } from "@/lib/db/scenarios";
import { buildPlan, planAsText } from "@/lib/plan";
import { PKEYS, STEADY_PUSH, bandName, fmt, pushLabel, type Push } from "@/lib/engine";
import { TrajectoryChart } from "@/components/TrajectoryChart";
import { CopyButton } from "@/components/CopyButton";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  const ctx = await getPortalContext();
  const { actor, cfg, values, scores, institution, entries, cycle } = ctx;
  if (!can(actor, { type: "scores:read" }) || !scores) redirect("/");

  const { scenario: scenarioId } = await searchParams;
  let push: Push = STEADY_PUSH;
  let pushName = "steady push (1.0× on every parameter)";
  const scenarios = cycle ? await listScenarios(cycle.id) : [];
  if (scenarioId) {
    const sc = await getScenario(scenarioId);
    if (sc && cycle && sc.cycleId === cycle.id) {
      push = sc.push;
      pushName = `scenario “${sc.name}” (${PKEYS.map((p) => `${p} ${fmt(sc.push[p], 1)}`).join(" · ")})`;
    }
  }

  const filled = new Set(entries.filter((e) => e.status === "VERIFIED" && e.value !== null).map((e) => e.indicatorId));
  const res = buildPlan(values, cfg, push, filled);
  const t = res.threshold;
  const text = planAsText(institution.name, values, cfg, res);
  const arriveYear = res.arrival === null ? null : cfg.baseYear + res.arrival;

  const chart = res.plan.slice(0, 13).map((p, i) => ({ year: cfg.baseYear + p.y, plan: p.score, required: res.target[i].score }));

  return (
    <>
      <div className="panel">
        <h2>Trajectory</h2>
        <p className="lede">
          Composite score projected forward from {cfg.baseYear} at {pushName}. The solid line is that push; the dotted line is the push required to hit{" "}
          {cfg.targetYear}.
        </p>
        {scenarios.length ? (
          <div className="row" style={{ marginBottom: 14 }}>
            <span className="small muted">Plan at:</span>
            <Link href="/plan" className="tinybtn" aria-current={!scenarioId ? "true" : undefined} style={!scenarioId ? { borderColor: "var(--seal)", color: "var(--seal)" } : undefined}>
              Steady push
            </Link>
            {scenarios.map((s) => (
              <Link
                key={s.id}
                href={`/plan?scenario=${s.id}`}
                className="tinybtn"
                style={scenarioId === s.id ? { borderColor: "var(--seal)", color: "var(--seal)" } : undefined}
              >
                {s.name}
              </Link>
            ))}
          </div>
        ) : null}
        <TrajectoryChart data={chart} threshold={t} targetYear={cfg.targetYear} />
        {res.verdict.kind === "unreachable" ? (
          <div className="note bad">
            <strong>{cfg.targetYear} is not reachable.</strong> Even at maximum plausible effort across all five parameters, the composite does not clear {t} by
            then. The binding constraints are the lagged indicators — citations, h-index, doctoral graduates and perception cannot be bought forward.{" "}
            {arriveYear !== null ? (
              <>
                The earliest credible year at your current push is <strong>{arriveYear}</strong>.
              </>
            ) : (
              "No arrival year within 20 years at the current push."
            )}
          </div>
        ) : res.verdict.kind === "implausible" ? (
          <div className="note bad">
            <strong>
              {cfg.targetYear} would need roughly {fmt(res.need, 1)}× your current effort.
            </strong>{" "}
            That is outside what an institution normally sustains. Either move the target year out, or lower the target band and treat the higher band as a
            second phase.
          </div>
        ) : res.verdict.kind === "tight" ? (
          <div className="note warn">
            <strong>{cfg.targetYear} is reachable but tight.</strong> It needs about {fmt(res.need, 1)}× your current push, concentrated where the leverage
            table says. The roadmap below is built at that intensity.
          </div>
        ) : (
          <div className="note ok">
            <strong>On track.</strong> At the current push the composite clears {t} in {arriveYear ?? "—"},{" "}
            {arriveYear !== null && arriveYear < cfg.targetYear ? "ahead of" : "at"} your target year. Consider raising the target band.
          </div>
        )}
        <div className="grid3" style={{ marginTop: 6 }}>
          <div className="stat">
            Arrival at {bandName(cfg.goal)}
            <div className="display">{arriveYear ?? "beyond 20 yr"}</div>
          </div>
          <div className="stat">
            Score in {cfg.targetYear}
            <div className="display" style={{ color: res.T > 0 && res.plan[res.T].score >= t ? "var(--seal)" : "var(--clay)" }}>
              {fmt(res.T > 0 ? res.plan[res.T].score : res.plan[0].score, 1)}
            </div>
          </div>
          <div className="stat">
            Roadmap intensity
            <div className="display">{res.need !== null && res.need !== Infinity && res.need > 1 ? `${fmt(res.need, 1)}×` : "1.0×"}</div>
            <span className="small muted">{PKEYS.map((p) => `${p} ${pushLabel(res.planPush[p])}`).join(" · ")}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Roadmap</h2>
        <p className="lede">
          Each year lists the moves that buy the most score that year, with the value to hit. These are derived from your own numbers, not a generic
          checklist.
        </p>
        <div className="row" style={{ marginBottom: 18 }}>
          <CopyButton text={text} label="Copy plan as text" />
        </div>
        <div className="yearblk">
          <h4>
            {cfg.baseYear} — foundation <span className="chk">before any score moves</span>
          </h4>
          <ul>
            <li>
              <span>Appoint a NIRF nodal officer with authority over departmental data returns</span>
              <span className="mv">governance</span>
            </li>
            <li>
              <span>Reconcile student, faculty and financial counts to a single institutional source</span>
              <span className="mv">data</span>
            </li>
            <li>
              <span>Consolidate Scopus and Web of Science records under one institution identifier</span>
              <span className="mv">data</span>
            </li>
            <li>
              <span>Evidence the {res.unevidenced} indicators currently carrying no verified data</span>
              <span className="mv">data</span>
            </li>
          </ul>
        </div>
        {res.roadmap.map((y) => (
          <div className="yearblk future" key={y.year}>
            <h4>
              {y.year}{" "}
              <span className="chk">
                checkpoint score {fmt(y.score, 1)} · {y.band.toLowerCase()}
              </span>
            </h4>
            {y.moves.length ? (
              <ul>
                {y.moves.map((m) => (
                  <li key={m.ind.id}>
                    <span>
                      <strong>{m.ind.nm}</strong> {fmt(m.from)} → {fmt(m.to)} {m.ind.u}
                      <br />
                      <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{m.ind.act}</span>
                    </span>
                    <span className="mv">+{fmt(m.gain, 2)} pts</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="help">No material movement available this year — lagged indicators are still maturing.</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
