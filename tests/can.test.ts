import { describe, expect, it } from "vitest";
import { assertCan, can, ForbiddenError, visibleParams, type Actor } from "@/lib/auth/can";
import { PKEYS } from "@/lib/engine";

const research: Actor = { id: "u1", role: "CONTRIBUTOR", institutionId: "i1", ownedParams: ["RP"] };
const iqac: Actor = { id: "u2", role: "IQAC", institutionId: "i1", ownedParams: [] };
const vc: Actor = { id: "u3", role: "LEADERSHIP", institutionId: "i1", ownedParams: [] };

describe("can(): contributors", () => {
  it("a CONTRIBUTOR owning RP is denied a write to an OI indicator", () => {
    // X54 is Female student percentage — OI
    expect(can(research, { type: "entry:write", indicatorId: "X54", cycleStatus: "DRAFT" })).toBe(false);
    expect(() => assertCan(research, { type: "entry:write", indicatorId: "X54", cycleStatus: "DRAFT" })).toThrow(
      ForbiddenError,
    );
  });

  it("a CONTRIBUTOR owning RP may write an RP indicator while the cycle is DRAFT", () => {
    expect(can(research, { type: "entry:write", indicatorId: "X16", cycleStatus: "DRAFT" })).toBe(true);
  });

  it("a CONTRIBUTOR cannot write once the cycle leaves DRAFT", () => {
    expect(can(research, { type: "entry:write", indicatorId: "X16", cycleStatus: "IN_REVIEW" })).toBe(false);
    expect(can(research, { type: "entry:write", indicatorId: "X16", cycleStatus: "LOCKED" })).toBe(false);
  });

  it("a CONTRIBUTOR can read only its own parameters and never scores", () => {
    expect(can(research, { type: "entry:read", indicatorId: "X16" })).toBe(true);
    expect(can(research, { type: "entry:read", indicatorId: "X1" })).toBe(false);
    expect(can(research, { type: "scores:read" })).toBe(false);
    expect(can(research, { type: "review:read" })).toBe(false);
    expect(can(research, { type: "cycle:manage" })).toBe(false);
    expect(can(research, { type: "settings:manage" })).toBe(false);
    expect(can(research, { type: "scenario:write" })).toBe(false);
    expect(can(research, { type: "users:manage" })).toBe(false);
  });

  it("a CONTRIBUTOR can submit its own drafts but not review", () => {
    expect(can(research, { type: "entry:submit", indicatorId: "X16", cycleStatus: "DRAFT" })).toBe(true);
    expect(can(research, { type: "entry:submit", indicatorId: "X54", cycleStatus: "DRAFT" })).toBe(false);
    expect(can(research, { type: "entry:submit", indicatorId: "X16", cycleStatus: "IN_REVIEW" })).toBe(false);
    expect(can(research, { type: "entry:review", cycleStatus: "DRAFT" })).toBe(false);
  });

  it("rejects unknown and derived-looking indicator ids", () => {
    expect(can(research, { type: "entry:write", indicatorId: "X999", cycleStatus: "DRAFT" })).toBe(false);
    expect(can(iqac, { type: "entry:write", indicatorId: "nope", cycleStatus: "DRAFT" })).toBe(false);
  });

  it("visibleParams narrows to owned parameters for contributors only", () => {
    expect(visibleParams(research, PKEYS)).toEqual(["RP"]);
    expect(visibleParams(iqac, PKEYS)).toEqual([...PKEYS]);
    expect(visibleParams(vc, PKEYS)).toEqual([...PKEYS]);
  });
});

describe("can(): IQAC", () => {
  it("reads everything, edits any value, reviews, manages cycles, settings and users", () => {
    expect(can(iqac, { type: "entry:read", indicatorId: "X54" })).toBe(true);
    expect(can(iqac, { type: "entry:write", indicatorId: "X54", cycleStatus: "DRAFT" })).toBe(true);
    expect(can(iqac, { type: "entry:write", indicatorId: "X54", cycleStatus: "IN_REVIEW" })).toBe(true);
    expect(can(iqac, { type: "entry:review", cycleStatus: "IN_REVIEW" })).toBe(true);
    expect(can(iqac, { type: "review:read" })).toBe(true);
    expect(can(iqac, { type: "scores:read" })).toBe(true);
    expect(can(iqac, { type: "cycle:manage" })).toBe(true);
    expect(can(iqac, { type: "settings:manage" })).toBe(true);
    expect(can(iqac, { type: "users:manage" })).toBe(true);
    expect(can(iqac, { type: "scenario:write" })).toBe(true);
  });

  it("cannot write into a LOCKED cycle", () => {
    expect(can(iqac, { type: "entry:write", indicatorId: "X54", cycleStatus: "LOCKED" })).toBe(false);
    expect(can(iqac, { type: "entry:review", cycleStatus: "LOCKED" })).toBe(false);
  });
});

describe("can(): leadership", () => {
  it("reads everything and runs scenarios but cannot edit entries or settings", () => {
    expect(can(vc, { type: "entry:read", indicatorId: "X54" })).toBe(true);
    expect(can(vc, { type: "scores:read" })).toBe(true);
    expect(can(vc, { type: "scenario:write" })).toBe(true);
    expect(can(vc, { type: "entry:write", indicatorId: "X54", cycleStatus: "DRAFT" })).toBe(false);
    expect(can(vc, { type: "entry:review", cycleStatus: "DRAFT" })).toBe(false);
    expect(can(vc, { type: "review:read" })).toBe(false);
    expect(can(vc, { type: "cycle:manage" })).toBe(false);
    expect(can(vc, { type: "settings:manage" })).toBe(false);
    expect(can(vc, { type: "users:manage" })).toBe(false);
  });
});
