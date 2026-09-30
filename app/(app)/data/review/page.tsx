import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/db/context";
import { can } from "@/lib/auth/can";
import { getPreviousCycle } from "@/lib/db/cycles";
import { listEntries, listEntriesByStatus } from "@/lib/db/entries";
import { ReviewQueue, type ReviewRow } from "./ReviewQueue";
import { IND_BY_ID } from "@/lib/engine";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  const ctx = await getPortalContext();
  const { actor, cycle } = ctx;
  if (!can(actor, { type: "review:read" })) redirect("/");
  if (!cycle) redirect("/cycles");

  const submitted = await listEntriesByStatus(cycle.id, "SUBMITTED");
  const prev = await getPreviousCycle(actor.institutionId, cycle.year);
  const prevEntries = prev ? await listEntries(prev.id) : [];
  const prevById = new Map(prevEntries.map((e) => [e.indicatorId, e]));

  const rows: ReviewRow[] = submitted.map((e) => {
    const ind = IND_BY_ID[e.indicatorId];
    const p = prevById.get(e.indicatorId);
    return {
      entry: e,
      name: ind.nm,
      param: ind.p,
      unit: ind.u,
      weight: ind.w,
      prevValue: p?.value ?? null,
    };
  });

  return (
    <div className="panel">
      <h2>Review queue</h2>
      <p className="lede">
        {rows.length ? `${rows.length} submitted ${rows.length === 1 ? "value" : "values"} from departments, ` : "Nothing is waiting for review. "}
        {prev ? `compared against the ${prev.year} cycle.` : "no earlier cycle to compare against."} Verifying makes a value count toward the composite;
        rejecting returns it to the department as a draft to fix.
      </p>
      <ReviewQueue rows={rows} prevYear={prev?.year ?? null} canReview={can(actor, { type: "entry:review", cycleStatus: cycle.status })} />
    </div>
  );
}
