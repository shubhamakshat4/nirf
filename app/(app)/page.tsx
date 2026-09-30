import Link from "next/link";
import { getPortalContext, type PortalContext } from "@/lib/db/context";
import { CATEGORIES, PKEYS, bandName, bandOf, fmt, IND_BY_ID, ENTERABLE } from "@/lib/engine";
import { ReadinessBars } from "@/components/ReadinessBars";

export default async function HomePage() {
  const ctx = await getPortalContext();
  const { actor } = ctx;
  return (
    <>
      {ctx.scores ? <ScoreOverview ctx={ctx} /> : null}
      <ReadinessPanel ctx={ctx} />
      {actor.role === "CONTRIBUTOR" ? <ContributorNext ctx={ctx} /> : actor.role === "IQAC" ? <IqacNext ctx={ctx} /> : <LeadershipNext ctx={ctx} />}
    </>
  );
}

function ScoreOverview({ ctx }: { ctx: PortalContext }) {
  const { cfg, scores, cycle } = ctx;
  if (!scores) return null;
  const w = CATEGORIES[cfg.category].w;
  const arriveYear = scores.arrival === null ? null : cfg.baseYear + scores.arrival;
  return (
    <div className="panel">
      <h2>Where you stand</h2>
      <p className="lede">
        Composite readiness from the {cycle?.year ?? "current"} cycle&apos;s verified data, against a target of {bandName(cfg.goal)} by{" "}
        {cfg.targetYear}. Only verified values count; an unverified number is a claim, not evidence.
      </p>
      <div className="grid3">
        <div className="stat">
          Composite
          <div className="display">{fmt(scores.composite, 1)}</div>
          <span className="small muted">{bandOf(scores.composite, cfg.bands)}</span>
        </div>
        <div className="stat">
          Needed for {bandName(cfg.goal)}
          <div className="display">{cfg.bands[cfg.goal]}</div>
          <span className="small muted">gap {fmt(Math.max(0, cfg.bands[cfg.goal] - scores.composite), 1)} points</span>
        </div>
        <div className="stat">
          Arrival at steady push
          <div className="display">{arriveYear ?? "beyond 20 yr"}</div>
          <span className="small muted">
            {scores.arrival === null ? "not within the horizon" : `${scores.arrival} year${scores.arrival === 1 ? "" : "s"} from ${cfg.baseYear}`}
          </span>
        </div>
        <div className="stat">
          Projected in {cfg.targetYear}
          <div className="display" style={{ color: scores.projected >= cfg.bands[cfg.goal] ? "var(--seal)" : "var(--clay)" }}>
            {fmt(scores.projected, 1)}
          </div>
          <span className="small muted">
            {scores.need === Infinity
              ? "target year not achievable"
              : scores.need === null
                ? "target year not after base"
                : scores.need > 1
                  ? `needs ${fmt(scores.need, 1)}× steady push`
                  : "on track"}
          </span>
        </div>
      </div>
      <hr className="rule" />
      {PKEYS.map((p) => (
        <div className="pbar" key={p}>
          <div className="nm">{p}</div>
          <div className="track">
            <div className="fill" style={{ width: `${scores.params[p]}%` }} />
          </div>
          <div className="val">
            {fmt(scores.params[p], 1)} · w {Math.round(w[p] * 100)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function ReadinessPanel({ ctx }: { ctx: PortalContext }) {
  const { readiness, actor } = ctx;
  const own = actor.role === "CONTRIBUTOR" ? actor.ownedParams : [...PKEYS];
  const tot = own.reduce((a, p) => a + (readiness.byParam[p]?.total ?? 0), 0);
  const ver = own.reduce((a, p) => a + (readiness.byParam[p]?.verified ?? 0), 0);
  return (
    <div className="panel">
      <h2>Submission readiness</h2>
      <p className="lede">
        NIRF is a data exercise before it is a performance exercise. An indicator you cannot evidence scores zero regardless of reality.
      </p>
      <div style={{ fontSize: 15, marginBottom: 12 }}>
        {ver} of {tot} indicators verified — <strong>{tot ? Math.round((100 * ver) / tot) : 0}%</strong> data readiness
      </div>
      <ReadinessBars byParam={readiness.byParam} params={own} />
      {ver < tot ? (
        <p className="help" style={{ marginTop: 8 }}>
          Unverified indicators are scored as zero. If a number exists but is not entered and verified here, the model is understating you.
        </p>
      ) : null}
    </div>
  );
}

function ContributorNext({ ctx }: { ctx: PortalContext }) {
  const { actor, entries, cycle } = ctx;
  const own = new Set(actor.ownedParams);
  const mine = entries.filter((e) => own.has(IND_BY_ID[e.indicatorId].p));
  const empty = mine.filter((e) => e.value === null);
  const draft = mine.filter((e) => e.status === "DRAFT");
  const rejected = mine.filter((e) => e.status === "REJECTED");
  const submitted = mine.filter((e) => e.status === "SUBMITTED");
  const locked = cycle?.status !== "DRAFT";
  return (
    <div className="panel">
      <h2>What to do next</h2>
      <p className="lede">
        You own {actor.ownedParams.join(", ")} for the {cycle?.year} cycle.{" "}
        {locked ? "The cycle is no longer open for edits." : "Enter each figure with a note on its source and a link to the evidence, then submit to IQAC."}
      </p>
      <ul className="todo">
        {rejected.length ? (
          <li>
            <span>
              <strong>{rejected.length} rejected</strong> — IQAC sent these back. Correct the value or evidence and resubmit.
            </span>
            <Link href="/data" className="btn sm">
              Fix
            </Link>
          </li>
        ) : null}
        {empty.length ? (
          <li>
            <span>
              <strong>{empty.length} indicators carry no data</strong> — {empty.slice(0, 4).map((e) => IND_BY_ID[e.indicatorId].nm).join(", ")}
              {empty.length > 4 ? "…" : ""}
            </span>
            <Link href="/data" className="btn sm">
              Enter
            </Link>
          </li>
        ) : null}
        {draft.length ? (
          <li>
            <span>
              <strong>{draft.length} drafts</strong> saved but not yet submitted for verification.
            </span>
            <Link href="/data" className="btn sm">
              Submit
            </Link>
          </li>
        ) : null}
        {submitted.length ? (
          <li>
            <span>
              <strong>{submitted.length} awaiting IQAC</strong> — nothing to do until they are verified or returned.
            </span>
            <span className="chipstat SUBMITTED">submitted</span>
          </li>
        ) : null}
        {!rejected.length && !empty.length && !draft.length && !submitted.length ? (
          <li>
            <span>Everything in your parameters is verified. Keep the evidence files where IQAC can find them.</span>
            <span className="chipstat VERIFIED">verified</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function IqacNext({ ctx }: { ctx: PortalContext }) {
  const { readiness, cycle, entries, cfg, scores } = ctx;
  const unevidenced = ENTERABLE.filter((i) => {
    const e = entries.find((x) => x.indicatorId === i.id);
    return !e || e.value === null;
  });
  return (
    <div className="panel">
      <h2>What to do next</h2>
      <p className="lede">
        IQAC owns the verification queue, the cycle status and the goal settings. The composite only moves when values are verified.
      </p>
      <ul className="todo">
        {readiness.submitted ? (
          <li>
            <span>
              <strong>{readiness.submitted} submitted values</strong> are waiting for verification.
            </span>
            <Link href="/data/review" className="btn sm">
              Review
            </Link>
          </li>
        ) : (
          <li>
            <span>The review queue is empty.</span>
            <span className="chipstat VERIFIED">clear</span>
          </li>
        )}
        {unevidenced.length ? (
          <li>
            <span>
              <strong>{unevidenced.length} indicators</strong> carry no data and score zero: {unevidenced.slice(0, 5).map((i) => i.id).join(", ")}
              {unevidenced.length > 5 ? "…" : ""}
            </span>
            <Link href="/data" className="btn sm">
              Data
            </Link>
          </li>
        ) : null}
        <li>
          <span>
            Cycle {cycle?.year} is <strong>{cycle?.status.toLowerCase().replace("_", " ")}</strong>.{" "}
            {cycle?.status === "DRAFT" ? "Move it to review once departments have submitted, then lock it after the NIRF return." : ""}
          </span>
          <Link href="/cycles" className="btn sm ghost">
            Cycles
          </Link>
        </li>
        {scores && scores.need !== null && scores.need > 1 ? (
          <li>
            <span>
              {bandName(cfg.goal)} by {cfg.targetYear} needs {scores.need === Infinity ? "more than 6×" : `${fmt(scores.need, 1)}×`} steady push.
              See which moves buy the most.
            </span>
            <Link href="/gaps" className="btn sm ghost">
              Gaps
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function LeadershipNext({ ctx }: { ctx: PortalContext }) {
  const { cfg, scores, readiness } = ctx;
  return (
    <div className="panel">
      <h2>What to do next</h2>
      <p className="lede">
        Leadership sets the ambition and funds the moves. The plan shows what each year has to deliver; the scenario lab shows what happens
        when effort is concentrated.
      </p>
      <ul className="todo">
        <li>
          <span>
            Read the year-by-year roadmap for {bandName(cfg.goal)} by {cfg.targetYear}
            {scores && scores.need !== null && scores.need > 1 ? ` — it currently needs ${scores.need === Infinity ? "more than 6×" : `${fmt(scores.need, 1)}×`} steady push.` : "."}
          </span>
          <Link href="/plan" className="btn sm">
            Plan
          </Link>
        </li>
        <li>
          <span>Compare where to concentrate effort — research-first against outcomes-first — on arrival year.</span>
          <Link href="/scenarios" className="btn sm ghost">
            Scenarios
          </Link>
        </li>
        {readiness.verified < readiness.total ? (
          <li>
            <span>
              {readiness.total - readiness.verified} indicators are unverified and score zero; the composite above is understated until IQAC clears
              them.
            </span>
            <span className="chipstat SUBMITTED">data gap</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
