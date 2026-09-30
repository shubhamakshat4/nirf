"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCan } from "@/lib/auth/can";
import { requireActorOrThrow } from "@/lib/auth/session";
import { getActiveCycle, getCycle } from "@/lib/db/cycles";
import { createScenario, deleteScenario, getScenario } from "@/lib/db/scenarios";
import { zId, zPush, type ScenarioRecord } from "@/lib/db/types";
import { fail, guard, ok, type ActionResult } from "./result";

const zSave = z.object({
  name: z.string().trim().min(1, "Give the scenario a name").max(80),
  push: zPush,
});

export async function saveScenario(raw: unknown): Promise<ActionResult<ScenarioRecord>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    assertCan(actor, { type: "scenario:write" });
    const input = zSave.parse(raw);
    const cycle = await getActiveCycle(actor.institutionId);
    if (!cycle) return fail("No active cycle");
    const created = await createScenario(cycle.id, input.name, input.push, actor.id);
    revalidatePath("/scenarios");
    revalidatePath("/plan");
    return ok(created);
  });
}

export async function removeScenario(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    assertCan(actor, { type: "scenario:write" });
    const { id } = z.object({ id: zId }).parse(raw);
    const sc = await getScenario(id);
    if (!sc) return fail("Scenario not found");
    const cycle = await getCycle(sc.cycleId);
    if (!cycle || cycle.institutionId !== actor.institutionId) return fail("Scenario not found");
    await deleteScenario(id);
    revalidatePath("/scenarios");
    revalidatePath("/plan");
    return ok({ id });
  });
}
