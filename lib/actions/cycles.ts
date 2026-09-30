"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCan } from "@/lib/auth/can";
import { requireActorOrThrow } from "@/lib/auth/session";
import { createNextCycleFrom, getCycle, getLatestCycle, listCycles, setCycleStatus } from "@/lib/db/cycles";
import { updateInstitution } from "@/lib/db/institution";
import { zCycleStatus, zId, type CycleRecord } from "@/lib/db/types";
import { fail, guard, ok, type ActionResult } from "./result";

/** IQAC: create next year's cycle pre-filled from the latest one. */
export async function createNextCycle(): Promise<ActionResult<CycleRecord>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    assertCan(actor, { type: "cycle:manage" });
    const latest = await getLatestCycle(actor.institutionId);
    if (!latest) return fail("No cycle to copy from");
    const open = (await listCycles(actor.institutionId)).find((c) => c.status !== "LOCKED");
    if (open) return fail(`Lock cycle ${open.year} before creating ${latest.year + 1}`);
    const created = await createNextCycleFrom(latest.id);
    // The new cycle is now the one everyone works in; the base year follows it.
    await updateInstitution(actor.institutionId, { baseYear: created.year });
    revalidatePath("/", "layout");
    return ok(created);
  });
}

const zStatus = z.object({ cycleId: zId, status: zCycleStatus });

const ALLOWED: Record<string, string[]> = {
  DRAFT: ["IN_REVIEW", "LOCKED"],
  IN_REVIEW: ["DRAFT", "LOCKED"],
  LOCKED: ["DRAFT"], // reopening is allowed but deliberate
};

/** IQAC: move a cycle between DRAFT, IN_REVIEW and LOCKED. */
export async function changeCycleStatus(raw: unknown): Promise<ActionResult<CycleRecord>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    assertCan(actor, { type: "cycle:manage" });
    const input = zStatus.parse(raw);
    const cycle = await getCycle(input.cycleId);
    if (!cycle || cycle.institutionId !== actor.institutionId) return fail("Cycle not found");
    if (!ALLOWED[cycle.status]?.includes(input.status)) return fail(`Cannot move a ${cycle.status} cycle to ${input.status}`);
    const updated = await setCycleStatus(cycle.id, input.status);
    revalidatePath("/", "layout");
    return ok(updated);
  });
}
