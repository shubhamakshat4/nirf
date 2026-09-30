import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/db/context";
import { can } from "@/lib/auth/can";
import { listScenarios } from "@/lib/db/scenarios";
import { ScenarioLab } from "./ScenarioLab";

export const metadata: Metadata = { title: "Scenarios" };

export default async function ScenariosPage() {
  const ctx = await getPortalContext();
  const { actor, cfg, values, scores, cycle } = ctx;
  if (!can(actor, { type: "scores:read" }) || !scores) redirect("/");
  const scenarios = cycle ? await listScenarios(cycle.id) : [];
  return (
    <ScenarioLab
      values={values}
      cfg={cfg}
      scenarios={scenarios}
      canWrite={can(actor, { type: "scenario:write" }) && !!cycle}
    />
  );
}
