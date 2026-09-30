import { BandRuler } from "./BandRuler";
import type { PortalContext } from "@/lib/db/context";
import { bandName, bandOf, fmt } from "@/lib/engine";

/** Sticky readout strip. Scores for IQAC/leadership; data readiness for contributors. */
export function Readout({ ctx }: { ctx: PortalContext }) {
  const { cfg, scores, readiness, actor, cycle, institution } = ctx;
  const T = cfg.targetYear - cfg.baseYear;
  const goal = bandName(cfg.goal);

  if (!scores) {
    const own = actor.ownedParams;
    const tot = own.reduce((a, p) => a + (readiness.byParam[p]?.total ?? 0), 0);
    const ver = own.reduce((a, p) => a + (readiness.byParam[p]?.verified ?? 0), 0);
    const sub = own.reduce((a, p) => a + (readiness.byParam[p]?.submitted ?? 0), 0);
    const pct = tot ? Math.round((100 * ver) / tot) : 0;
    return (
      <section className="readout" aria-label="Data readiness">
        <div className="readout-inner">
          <div className="scorebox">
            <div className="num">{pct}%</div>
            <div>
              <div className="cap">
                Data readiness · {own.join(", ") || "no parameters"} · cycle {cycle?.year ?? "—"}
              </div>
              <div className="verdict">
                <span className="pill plain">
                  {ver} of {tot} indicators verified
                </span>
                {sub > 0 ? <span className="pill warn">{sub} awaiting IQAC review</span> : null}
                {cycle?.status !== "DRAFT" ? <span className="pill plain">cycle {cycle?.status.toLowerCase().replace("_", " ")}</span> : null}
              </div>
            </div>
          </div>
          <BandRuler bands={cfg.bands} goal={cfg.goal} targetYear={cfg.targetYear} />
        </div>
      </section>
    );
  }

  const { composite: sc, arrival, need, projected } = scores;
  const arriveYear = arrival === null ? null : cfg.baseYear + arrival;
  return (
    <section className="readout" aria-label="Composite readiness">
      <div className="readout-inner">
        <div className="scorebox">
          <div className="num">{fmt(sc, 1)}</div>
          <div>
            <div className="cap">
              Composite readiness score · {institution.name} · cycle {cycle?.year ?? "—"}
            </div>
            <div className="verdict">
              <span className="pill plain">{bandOf(sc, cfg.bands)} today</span>
              {arrival === null ? (
                <span className="pill bad">{goal} not reachable within 20 years at steady push</span>
              ) : (
                <span className={arriveYear !== null && arriveYear <= cfg.targetYear ? "pill ok" : "pill warn"}>
                  {goal} reached in {arriveYear} ({arrival} yr) at steady push
                </span>
              )}
              {T > 0 &&
                (need === Infinity ? (
                  <span className="pill bad">Target year {cfg.targetYear} is not achievable</span>
                ) : need !== null && need > 2 ? (
                  <span className="pill bad">Needs {fmt(need, 1)}× steady push — beyond plausible</span>
                ) : need !== null && need > 1 ? (
                  <span className="pill warn">
                    Needs {fmt(need, 1)}× steady push to hit {cfg.targetYear}
                  </span>
                ) : (
                  <span className="pill ok">On track for {cfg.targetYear}</span>
                ))}
              {readiness.submitted > 0 ? <span className="pill warn">{readiness.submitted} values awaiting review</span> : null}
            </div>
          </div>
        </div>
        <BandRuler now={sc} proj={projected} bands={cfg.bands} goal={cfg.goal} targetYear={cfg.targetYear} />
      </div>
    </section>
  );
}
