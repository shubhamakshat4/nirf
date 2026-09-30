import type { Metadata } from "next";
import { getPortalContext } from "@/lib/db/context";
import { can, visibleParams } from "@/lib/auth/can";
import { valuesFromEntries } from "@/lib/db/entries";
import { DERIVE_DEPS, IND, PKEYS, type IndicatorId, type Values } from "@/lib/engine";
import { DataForm } from "./DataForm";

export const metadata: Metadata = { title: "Data" };

export default async function DataPage() {
  const ctx = await getPortalContext();
  const { actor, cycle, entries, cfg } = ctx;
  if (!cycle) {
    return (
      <div className="panel">
        <h2>No cycle yet</h2>
        <p className="lede">IQAC needs to create a submission cycle before data can be entered.</p>
      </div>
    );
  }
  const params = visibleParams(actor, PKEYS);
  const paramSet = new Set(params);

  // Which indicator ids this actor's browser needs to draw its rows and meters.
  const visibleIds = new Set<IndicatorId>();
  for (const ind of IND) if (paramSet.has(ind.p)) visibleIds.add(ind.id);
  const needed = new Set<IndicatorId>(["X1"]);
  for (const id of visibleIds) {
    needed.add(id);
    for (const d of DERIVE_DEPS[id] ?? []) needed.add(d);
  }

  // Live meters use every entered value regardless of status — the meter shows the number typed, not the verified score.
  const all = valuesFromEntries(entries, { onlyVerified: false });
  const baseValues: Values = {};
  for (const [k, v] of Object.entries(all)) if (needed.has(k as IndicatorId)) baseValues[k as IndicatorId] = v;

  const rows = entries.filter((e) => visibleIds.has(e.indicatorId));
  const editable: Partial<Record<IndicatorId, boolean>> = {};
  for (const e of rows) editable[e.indicatorId] = can(actor, { type: "entry:write", indicatorId: e.indicatorId, cycleStatus: cycle.status });
  const canSubmit = params.filter((p) => {
    const probe = IND.find((i) => i.p === p && !i.der);
    return probe ? can(actor, { type: "entry:submit", indicatorId: probe.id, cycleStatus: cycle.status }) : false;
  });

  return (
    <div className="panel">
      <h2>Institutional data</h2>
      <p className="lede">
        Cycle {cycle.year} · {cycle.status.toLowerCase().replace("_", " ")}.{" "}
        {actor.role === "CONTRIBUTOR"
          ? "Enter what you have, with a note on the source and a link to the evidence. Save as you go; submit a parameter when it is ready for IQAC."
          : actor.role === "IQAC"
            ? "Every value you save here is verified on save. Contributor submissions are reviewed on the Review page."
            : "Read-only view of every entered value and its verification status."}{" "}
        Blank fields count as zero and are flagged as evidence gaps rather than performance gaps.
      </p>
      <DataForm
        cycleId={cycle.id}
        cycleStatus={cycle.status}
        role={actor.role}
        params={params}
        entries={rows}
        baseValues={baseValues}
        cfg={{ peer: cfg.peer, sizeNorm: cfg.sizeNorm, category: cfg.category }}
        editable={editable}
        submittable={canSubmit}
        showScores={can(actor, { type: "scores:read" })}
      />
    </div>
  );
}
