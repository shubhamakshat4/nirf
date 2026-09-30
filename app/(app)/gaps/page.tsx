import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/db/context";
import { can } from "@/lib/auth/can";
import { CATEGORIES, PARAM_NAMES, PKEYS, bounds, clamp, fmt, priorities, threshold, withDerived } from "@/lib/engine";

export const metadata: Metadata = { title: "Gaps" };

export default async function GapsPage() {
  const ctx = await getPortalContext();
  const { actor, cfg, values, scores, entries } = ctx;
  if (!can(actor, { type: "scores:read" }) || !scores) redirect("/");

  const ps = scores.params;
  const w = CATEGORIES[cfg.category].w;
  const t = threshold(cfg);
  const sc = scores.composite;
  // required parameter level: proportional lift to reach threshold
  const lift = t - sc;
  const need = (p: (typeof PKEYS)[number]) => clamp(ps[p] + lift * (1 - ps[p] / 100) * 1.6, 0, 100);

  const rows = PKEYS.map((p) => {
    const nd = need(p);
    const gap = nd > ps[p] ? ((nd - ps[p]) / nd) * 100 : 0;
    return { p, cur: ps[p], need: nd, gap, pri: (gap * w[p] * 100) / 10 };
  }).sort((a, b) => b.pri - a.pri);

  const lev = priorities(values, cfg)
    .filter((r) => !r.ind.der)
    .sort((a, b) => b.lev - a.lev)
    .slice(0, 16);
  const st = withDerived(values).X1 || 0;
  const verified = new Map(entries.filter((e) => e.status === "VERIFIED" && e.value !== null).map((e) => [e.indicatorId, e.value as number]));

  return (
    <>
      <div className="panel">
        <h2>Where you stand</h2>
        <p className="lede">
          Parameter scores against the target band. The ochre marker is the score each parameter needs to carry for the composite to clear your
          target of {t}.
        </p>
        {PKEYS.map((p) => {
          const nd = need(p);
          return (
            <div className="pbar" key={p}>
              <div className="nm">{p}</div>
              <div className="track" aria-label={`${p} ${fmt(ps[p], 1)}${lift > 0 ? `, needs ${fmt(nd, 0)}` : ""}`}>
                <div className="fill" style={{ width: `${ps[p]}%` }} />
                {lift > 0 ? <div className="tgt" style={{ left: `${nd}%` }} /> : null}
              </div>
              <div className="val">
                {fmt(ps[p], 1)}
                {lift > 0 ? ` → ${fmt(nd, 0)}` : ""} · w {Math.round(w[p] * 100)}%
              </div>
            </div>
          );
        })}
        <hr className="rule" />
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th className="n">Weight</th>
                <th className="n">Current</th>
                <th className="n">Needed</th>
                <th className="n">Gap</th>
                <th className="n">Priority</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p}>
                  <td>
                    {r.p} — {PARAM_NAMES[r.p]}
                  </td>
                  <td className="n">{Math.round(w[r.p] * 100)}%</td>
                  <td className="n">{fmt(r.cur, 1)}</td>
                  <td className="n">{fmt(r.need, 1)}</td>
                  <td className="n" style={{ color: r.gap > 25 ? "var(--clay)" : r.gap > 10 ? "var(--ochre)" : "var(--seal)" }}>
                    {fmt(r.gap, 1)}%
                  </td>
                  <td className="n">{fmt(r.pri, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="help" style={{ marginTop: 10 }}>
          Priority index follows the paper&apos;s formulation: percentage gap weighted by the parameter&apos;s contribution to the composite.
        </p>
      </div>

      <div className="panel">
        <h2>Highest-leverage moves</h2>
        <p className="lede">
          Ranked by score gained per unit of effort — sub-parameter weight × parameter weight × remaining gap, divided by how hard the move is.
          The top of this list is where the next rupee and the next hire should go.
        </p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Move</th>
                <th className="n">Now</th>
                <th className="n">Peer ceiling</th>
                <th className="n">Score</th>
                <th className="n">Effort</th>
              </tr>
            </thead>
            <tbody>
              {lev.map((r) => {
                const [mn, mx] = bounds(r.ind, st, cfg);
                const ceil = r.ind.inv ? mn : mx;
                const now = verified.get(r.ind.id);
                return (
                  <tr key={r.ind.id}>
                    <td>
                      <strong>{r.ind.nm}</strong> <span className="muted">{r.ind.id}</span>
                      <br />
                      <span style={{ color: "var(--ink-2)", fontSize: 12.5 }}>{r.ind.act}</span>
                    </td>
                    <td className="n">{now !== undefined ? fmt(now) : "—"}</td>
                    <td className="n">{fmt(ceil)}</td>
                    <td className="n">{fmt(r.cur, 0)}</td>
                    <td className="n">{["", "low", "medium", "high"][r.ind.eff]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
