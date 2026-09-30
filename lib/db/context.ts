import { cache } from "react";
import { requireActor } from "@/lib/auth/session";
import { can, type Actor } from "@/lib/auth/can";
import { getInstitution } from "./institution";
import { getActiveCycle } from "./cycles";
import { listEntries, valuesFromEntries } from "./entries";
import { engineConfigOf, type CycleRecord, type EntryRecord, type InstitutionRecord } from "./types";
import {
  ENTERABLE,
  STEADY_PUSH,
  arrivalYear,
  composite,
  paramScores,
  requiredFactor,
  simulate,
  type EngineConfig,
  type Param,
  type Values,
} from "@/lib/engine";

export type Scores = {
  composite: number;
  params: Record<Param, number>;
  /** years from base year, or null when beyond 20 years */
  arrival: number | null;
  /** projected composite in the target year at steady push */
  projected: number;
  /** scalar on steady push needed to hit the target year; null if T<=0; Infinity if unreachable */
  need: number | null;
};

export type Readiness = {
  /** enterable indicators in scope */
  total: number;
  /** with a VERIFIED value */
  verified: number;
  /** with any value */
  filled: number;
  byParam: Record<Param, { total: number; verified: number; filled: number; submitted: number }>;
  submitted: number;
};

export type PortalContext = {
  actor: Actor & { email: string; name: string };
  institution: InstitutionRecord;
  cfg: EngineConfig;
  cycle: CycleRecord | null;
  entries: EntryRecord[];
  /** VERIFIED values only — what the composite is computed on */
  values: Values;
  /** null for roles that may not see scores */
  scores: Scores | null;
  readiness: Readiness;
};

export function computeScores(values: Values, cfg: EngineConfig): Scores {
  const T = cfg.targetYear - cfg.baseYear;
  const comp = composite(values, cfg);
  const projected = T > 0 ? simulate(values, cfg, STEADY_PUSH, Math.max(T, 1))[T].score : comp;
  return {
    composite: comp,
    params: paramScores(values, cfg),
    arrival: arrivalYear(values, cfg, STEADY_PUSH),
    projected,
    need: requiredFactor(values, cfg, STEADY_PUSH),
  };
}

export function computeReadiness(entries: readonly EntryRecord[]): Readiness {
  const byId = new Map(entries.map((e) => [e.indicatorId, e]));
  const byParam = {} as Readiness["byParam"];
  let total = 0;
  let verified = 0;
  let filled = 0;
  let submitted = 0;
  for (const ind of ENTERABLE) {
    const e = byId.get(ind.id);
    const has = e?.value !== null && e?.value !== undefined;
    const ver = has && e?.status === "VERIFIED";
    const sub = e?.status === "SUBMITTED";
    const bp = (byParam[ind.p] ??= { total: 0, verified: 0, filled: 0, submitted: 0 });
    bp.total++;
    total++;
    if (has) {
      filled++;
      bp.filled++;
    }
    if (ver) {
      verified++;
      bp.verified++;
    }
    if (sub) {
      submitted++;
      bp.submitted++;
    }
  }
  return { total, verified, filled, submitted, byParam };
}

/** Everything a signed-in page needs, fetched once per request. */
export const getPortalContext = cache(async (): Promise<PortalContext> => {
  const actor = await requireActor();
  const institution = await getInstitution(actor.institutionId);
  if (!institution) throw new Error("Institution not found for this user");
  const cfg = engineConfigOf(institution);
  const cycle = await getActiveCycle(institution.id);
  const entries = cycle ? await listEntries(cycle.id) : [];
  const values = valuesFromEntries(entries);
  const scores = can(actor, { type: "scores:read" }) ? computeScores(values, cfg) : null;
  return { actor, institution, cfg, cycle, entries, values, scores, readiness: computeReadiness(entries) };
});
