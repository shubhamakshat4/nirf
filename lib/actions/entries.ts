"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCan, can } from "@/lib/auth/can";
import { requireActorOrThrow } from "@/lib/auth/session";
import { getCycle } from "@/lib/db/cycles";
import { getEntryById, setEntryStatus, submitEntries, upsertEntry } from "@/lib/db/entries";
import { zEnterableId, zId, zParam, type EntryRecord, type EntryStatus } from "@/lib/db/types";
import { IND_BY_ID, type IndicatorId } from "@/lib/engine";
import { fail, guard, ok, type ActionResult } from "./result";

const zItem = z.object({
  indicatorId: zEnterableId,
  value: z.number().finite().min(0).max(1e9).nullable(),
  note: z.string().trim().max(500).nullable().optional(),
  evidenceUrl: z
    .string()
    .trim()
    .max(500)
    .refine((s) => s === "" || /^https?:\/\//i.test(s), "Evidence must be an http(s) link")
    .nullable()
    .optional(),
});

const zSave = z.object({
  cycleId: zId,
  items: z.array(zItem).min(1).max(80),
});

export type SaveInput = z.infer<typeof zSave>;

/**
 * Save one or more entries. IQAC saves land as VERIFIED (they are the
 * verifier); contributor saves land as DRAFT. Clearing the value empties
 * the row. Every value change is logged.
 */
export async function saveEntries(raw: unknown): Promise<ActionResult<EntryRecord[]>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    const input = zSave.parse(raw);
    const cycle = await getCycle(input.cycleId);
    if (!cycle || cycle.institutionId !== actor.institutionId) return fail("Cycle not found");
    for (const it of input.items) {
      assertCan(
        actor,
        { type: "entry:write", indicatorId: it.indicatorId, cycleStatus: cycle.status },
        `You cannot edit ${it.indicatorId} (${IND_BY_ID[it.indicatorId as IndicatorId].p}) in a ${cycle.status} cycle`,
      );
    }
    const saved: EntryRecord[] = [];
    for (const it of input.items) {
      const hasValue = it.value !== null;
      const status: EntryStatus = !hasValue ? "EMPTY" : actor.role === "IQAC" ? "VERIFIED" : "DRAFT";
      saved.push(
        await upsertEntry(
          cycle.id,
          it.indicatorId as IndicatorId,
          {
            value: it.value,
            note: it.note === undefined ? undefined : it.note || null,
            evidenceUrl: it.evidenceUrl === undefined ? undefined : it.evidenceUrl || null,
          },
          status,
          actor.id,
        ),
      );
    }
    revalidatePath("/", "layout");
    return ok(saved);
  });
}

const zSubmit = z.object({ cycleId: zId, param: zParam });

/** Contributor: send every DRAFT/REJECTED value in one parameter to IQAC. */
export async function submitParam(raw: unknown): Promise<ActionResult<{ count: number }>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    const input = zSubmit.parse(raw);
    const cycle = await getCycle(input.cycleId);
    if (!cycle || cycle.institutionId !== actor.institutionId) return fail("Cycle not found");
    // Any indicator of the parameter stands in for the ownership check.
    const probe = Object.values(IND_BY_ID).find((i) => i.p === input.param && !i.der);
    if (!probe) return fail("Unknown parameter");
    assertCan(actor, { type: "entry:submit", indicatorId: probe.id, cycleStatus: cycle.status }, "You cannot submit this parameter");
    const count = await submitEntries(cycle.id, [input.param], actor.id);
    revalidatePath("/", "layout");
    return ok({ count });
  });
}

const zReview = z.object({ entryId: zId, decision: z.enum(["VERIFIED", "REJECTED"]) });

/** IQAC: verify or reject a SUBMITTED entry. */
export async function reviewEntry(raw: unknown): Promise<ActionResult<EntryRecord>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    const input = zReview.parse(raw);
    const entry = await getEntryById(input.entryId);
    if (!entry) return fail("Entry not found");
    const cycle = await getCycle(entry.cycleId);
    if (!cycle || cycle.institutionId !== actor.institutionId) return fail("Cycle not found");
    assertCan(actor, { type: "entry:review", cycleStatus: cycle.status });
    if (entry.status !== "SUBMITTED") return fail("Only submitted entries can be reviewed");
    const updated = await setEntryStatus(entry.id, input.decision, actor.id);
    revalidatePath("/", "layout");
    return ok(updated);
  });
}

/** Cheap check used by the /data page to decide which rows are editable. */
export async function canEditIndicator(indicatorId: string, cycleStatus: "DRAFT" | "IN_REVIEW" | "LOCKED"): Promise<boolean> {
  const actor = await requireActorOrThrow();
  return can(actor, { type: "entry:write", indicatorId, cycleStatus });
}
