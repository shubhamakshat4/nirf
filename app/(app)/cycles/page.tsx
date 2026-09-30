import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalContext, computeReadiness } from "@/lib/db/context";
import { can } from "@/lib/auth/can";
import { listCycles } from "@/lib/db/cycles";
import { listEntries, valuesFromEntries } from "@/lib/db/entries";
import { bandName, composite, fmt, threshold } from "@/lib/engine";
import { TrendChart, type TrendPoint } from "@/components/TrendChart";
import { CycleActions } from "./CycleActions";
import { StatusChip } from "@/components/StatusChip";

export const metadata: Metadata = { title: "Cycles" };

export default async function CyclesPage() {
  const ctx = await getPortalContext();
  const { actor, cfg, cycle: active } = ctx;
  if (!can(actor, { type: "cycle:manage" })) redirect("/");

  const cycles = await listCycles(actor.institutionId);
  const rows = await Promise.all(
    cycles.map(async (c) => {
      const entries = await listEntries(c.id);
      const values = valuesFromEntries(entries);
      const r = computeReadiness(entries);
      return { c, composite: composite(values, cfg), readiness: r };
    }),
  );
  const trend: TrendPoint[] = rows.map((r) => ({ year: r.c.year, composite: r.composite, status: r.c.status }));
  const latestYear = cycles.length ? Math.max(...cycles.map((c) => c.year)) : null;
  const hasOpen = cycles.some((c) => c.status !== "LOCKED");

  return (
    <>
      <div className="panel">
        <h2>Trend across cycles</h2>
        <p className="lede">
          Composite readiness per submission cycle, scored with today&apos;s settings so the years are comparable. Filled points are locked
          cycles; the hollow point is the cycle still being worked. Same institution, every year — the trend is the story, not the snapshot.
        </p>
        {trend.length ? <TrendChart data={trend} threshold={threshold(cfg)} goalName={bandName(cfg.goal)} /> : <p className="help">No cycles yet.</p>}
      </div>

      <div className="panel">
        <h2>Cycles</h2>
        <p className="lede">
          One cycle per NIRF year. Contributors can only edit a DRAFT cycle; move it to review to freeze departmental edits, then lock it once the
          return is filed. Creating the next cycle copies every value across as a draft to be re-confirmed.
        </p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Status</th>
                <th className="n">Composite</th>
                <th className="n">Verified</th>
                <th className="n">Pending</th>
                <th>Locked</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, composite: sc, readiness }) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.year}</strong>
                    {active?.id === c.id ? <span className="small muted"> · active</span> : null}
                  </td>
                  <td>
                    <StatusChip status={c.status} />
                  </td>
                  <td className="n">{fmt(sc, 1)}</td>
                  <td className="n">
                    {readiness.verified}/{readiness.total}
                  </td>
                  <td className="n">{readiness.submitted || "—"}</td>
                  <td className="small muted">{c.lockedAt ? new Date(c.lockedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                  <td>
                    <CycleActions cycleId={c.id} status={c.status} year={c.year} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <hr className="rule" />
        <CycleActions
          cycleId={null}
          status={null}
          year={latestYear}
          createDisabled={hasOpen}
          createHint={hasOpen ? `Lock cycle ${cycles.find((c) => c.status !== "LOCKED")?.year} before creating ${latestYear !== null ? latestYear + 1 : "the next"}.` : undefined}
        />
      </div>
    </>
  );
}
