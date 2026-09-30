import { IND_BY_ID, isIndicatorId, type IndicatorId, type Param } from "@/lib/engine";
import type { CycleStatus, Role } from "@/lib/db/types";

/** The minimum a route handler or server action needs to know about the caller. */
export type Actor = {
  id: string;
  role: Role;
  institutionId: string;
  ownedParams: Param[];
};

export type Action =
  /** read any entry (value/note/evidence) for an indicator */
  | { type: "entry:read"; indicatorId: string }
  /** change value/note/evidence of an entry in a cycle */
  | { type: "entry:write"; indicatorId: string; cycleStatus: CycleStatus }
  /** move own DRAFT/REJECTED entries to SUBMITTED */
  | { type: "entry:submit"; indicatorId: string; cycleStatus: CycleStatus }
  /** verify or reject SUBMITTED entries */
  | { type: "entry:review"; cycleStatus: CycleStatus }
  /** see composite, parameter scores, gaps, plan */
  | { type: "scores:read" }
  /** create, lock, reopen cycles */
  | { type: "cycle:manage" }
  /** change category, goal, bands, peer, sizeNorm */
  | { type: "settings:manage" }
  /** create / delete users */
  | { type: "users:manage" }
  /** create or delete a saved scenario */
  | { type: "scenario:write" }
  /** view the review queue */
  | { type: "review:read" };

function paramOf(indicatorId: string): Param | null {
  return isIndicatorId(indicatorId) ? IND_BY_ID[indicatorId as IndicatorId].p : null;
}

/**
 * Single source of truth for authorisation. Every route handler and server
 * action calls this before touching the database; the UI only mirrors it.
 */
export function can(actor: Actor, action: Action): boolean {
  const { role } = actor;
  switch (action.type) {
    case "entry:read": {
      if (role === "IQAC" || role === "LEADERSHIP") return true;
      const p = paramOf(action.indicatorId);
      return p !== null && actor.ownedParams.includes(p);
    }
    case "entry:write": {
      if (action.cycleStatus === "LOCKED") return false;
      const p = paramOf(action.indicatorId);
      if (p === null) return false;
      if (role === "IQAC") return true;
      if (role === "CONTRIBUTOR") return action.cycleStatus === "DRAFT" && actor.ownedParams.includes(p);
      return false;
    }
    case "entry:submit": {
      if (action.cycleStatus !== "DRAFT") return false;
      const p = paramOf(action.indicatorId);
      if (p === null) return false;
      return role === "CONTRIBUTOR" && actor.ownedParams.includes(p);
    }
    case "entry:review":
      return role === "IQAC" && action.cycleStatus !== "LOCKED";
    case "review:read":
      return role === "IQAC";
    case "scores:read":
      return role === "IQAC" || role === "LEADERSHIP";
    case "cycle:manage":
    case "settings:manage":
    case "users:manage":
      return role === "IQAC";
    case "scenario:write":
      return role === "IQAC" || role === "LEADERSHIP";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not allowed") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertCan(actor: Actor, action: Action, message?: string): void {
  if (!can(actor, action)) throw new ForbiddenError(message ?? `Not allowed: ${action.type}`);
}

/** Which parameters this actor may see rows for on /data. */
export function visibleParams(actor: Actor, all: readonly Param[]): Param[] {
  if (actor.role === "IQAC" || actor.role === "LEADERSHIP") return [...all];
  return all.filter((p) => actor.ownedParams.includes(p));
}
