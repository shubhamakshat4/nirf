/**
 * End-to-end workflow through the real server actions against an isolated
 * SQLite database (prisma/test.db). Only the session lookup and Next's cache
 * revalidation are mocked; can(), Zod, Prisma and the engine all run for real.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/can";
import { SAMPLE, composite, defaultConfig, type Values } from "@/lib/engine";

process.env.DATABASE_URL = "file:./test.db";

let current: Actor & { email: string; name: string };
vi.mock("@/lib/auth/session", () => ({
  requireActorOrThrow: async () => current,
  requireActor: async () => current,
  currentActor: async () => current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const root = path.resolve(__dirname, "../..");
const env = { ...process.env, DATABASE_URL: "file:./test.db" };

type Db = typeof import("@/lib/db/client");
type Users = typeof import("@/lib/db/users");
type Entries = typeof import("@/lib/db/entries");
type Cycles = typeof import("@/lib/db/cycles");
type Institution = typeof import("@/lib/db/institution");
type Scenarios = typeof import("@/lib/db/scenarios");
type EntryActions = typeof import("@/lib/actions/entries");
type CycleActions = typeof import("@/lib/actions/cycles");
type ScenarioActions = typeof import("@/lib/actions/scenarios");
type SettingsActions = typeof import("@/lib/actions/settings");

let db: Db, users: Users, entries: Entries, cycles: Cycles, institution: Institution, scenarios: Scenarios;
let ea: EntryActions, ca: CycleActions, sa: ScenarioActions, st: SettingsActions;
let instId: string;
let cycleId: string;
const actors: Record<string, Actor & { email: string; name: string }> = {};

async function as(email: string) {
  current = actors[email];
}

async function verifiedComposite(cId = cycleId): Promise<number> {
  const inst = await institution.getInstitution(instId);
  const cfg = {
    category: inst!.category,
    goal: inst!.targetBand,
    bands: inst!.bands,
    peer: inst!.peerBand,
    sizeNorm: inst!.sizeNorm,
    baseYear: inst!.baseYear,
    targetYear: inst!.targetYear,
  };
  return composite(entries.valuesFromEntries(await entries.listEntries(cId)), cfg);
}

beforeAll(async () => {
  // A throwaway database file owned by this test: start from nothing each run.
  for (const f of ["prisma/test.db", "prisma/test.db-journal"]) fs.rmSync(path.join(root, f), { force: true });
  execSync("npx prisma db push --skip-generate", { cwd: root, env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { cwd: root, env, stdio: "pipe" });
  db = await import("@/lib/db/client");
  users = await import("@/lib/db/users");
  entries = await import("@/lib/db/entries");
  cycles = await import("@/lib/db/cycles");
  institution = await import("@/lib/db/institution");
  scenarios = await import("@/lib/db/scenarios");
  ea = await import("@/lib/actions/entries");
  ca = await import("@/lib/actions/cycles");
  sa = await import("@/lib/actions/scenarios");
  st = await import("@/lib/actions/settings");
  const inst = await db.prisma.institution.findFirstOrThrow();
  instId = inst.id;
  for (const email of ["iqac@ssu.edu", "vc@ssu.edu", "research@ssu.edu", "placement@ssu.edu"]) {
    const u = await users.findUserByEmail(email);
    if (!u) throw new Error("seed missing " + email);
    actors[email] = { id: u.id, role: u.role, institutionId: u.institutionId, ownedParams: u.ownedParams, email: u.email, name: u.name };
  }
  const active = await cycles.getActiveCycle(instId);
  cycleId = active!.id;
}, 120_000);

describe("seed", () => {
  it("2026 DRAFT cycle scores the calibrated composite from verified values", async () => {
    const c = await cycles.getCycle(cycleId);
    expect(c?.year).toBe(2026);
    expect(c?.status).toBe("DRAFT");
    expect(await verifiedComposite()).toBeCloseTo(46.7236, 3);
  });

  it("2025 LOCKED cycle carries values at 88% and scores lower", async () => {
    const prev = await cycles.getPreviousCycle(instId, 2026);
    expect(prev?.status).toBe("LOCKED");
    const e = await entries.getEntry(prev!.id, "X1");
    expect(e?.value).toBeCloseTo(6850 * 0.88, 1);
    expect(await verifiedComposite(prev!.id)).toBeLessThan(46.7236);
  });

  it("passwords are bcrypt-hashed and verify", async () => {
    const u = await users.findUserByEmail("iqac@ssu.edu");
    expect(u?.passwordHash.startsWith("$2")).toBe(true);
    expect(await users.verifyPassword(u!, "nirf1234")).toBe(true);
    expect(await users.verifyPassword(u!, "wrong")).toBe(false);
  });
});

describe("Phase 4 checkpoint: contributor edits, IQAC verifies, composite moves", () => {
  const before = 46.7236;
  let afterDraft: number;

  it("research@ssu.edu saves X16 as DRAFT and the change is logged", async () => {
    await as("research@ssu.edu");
    const res = await ea.saveEntries({ cycleId, items: [{ indicatorId: "X16", value: 1300, note: "Scopus export Sep 2026", evidenceUrl: "https://example.org/scopus.csv" }] });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data[0].status).toBe("DRAFT");
    expect(res.data[0].value).toBe(1300);
    expect(res.data[0].updatedByName).toBe("Research Cell");
    const logs = await entries.listEntryLogs(res.data[0].id);
    expect(logs[0]).toMatchObject({ oldValue: 1240, newValue: 1300, userName: "Research Cell" });
    // an unverified value no longer counts, so the composite dips
    afterDraft = await verifiedComposite();
    expect(afterDraft).toBeLessThan(before);
  });

  it("research@ssu.edu cannot write an OI indicator", async () => {
    await as("research@ssu.edu");
    const res = await ea.saveEntries({ cycleId, items: [{ indicatorId: "X54", value: 41 }] });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/cannot edit X54 \(OI\)/);
    const e = await entries.getEntry(cycleId, "X54");
    expect(e?.value).toBe(40);
    expect(e?.status).toBe("VERIFIED");
  });

  it("rejects a derived indicator id and bad input shapes", async () => {
    await as("iqac@ssu.edu");
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X5", value: 10 }] })).ok).toBe(false);
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X16", value: -1 }] })).ok).toBe(false);
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X16", value: 1, evidenceUrl: "ftp://x" }] })).ok).toBe(false);
    expect((await ea.saveEntries({ nope: true })).ok).toBe(false);
  });

  it("research@ssu.edu submits RP; the entry becomes SUBMITTED", async () => {
    await as("research@ssu.edu");
    const res = await ea.submitParam({ cycleId, param: "RP" });
    expect(res).toEqual({ ok: true, data: { count: 1 } });
    expect((await entries.getEntry(cycleId, "X16"))?.status).toBe("SUBMITTED");
    // cannot submit a parameter it does not own
    expect((await ea.submitParam({ cycleId, param: "GO" })).ok).toBe(false);
  });

  it("leadership can neither edit nor review", async () => {
    await as("vc@ssu.edu");
    const e = await entries.getEntry(cycleId, "X16");
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X16", value: 1 }] })).ok).toBe(false);
    expect((await ea.reviewEntry({ entryId: e!.id, decision: "VERIFIED" })).ok).toBe(false);
    expect((await entries.getEntry(cycleId, "X16"))?.status).toBe("SUBMITTED");
  });

  it("iqac@ssu.edu verifies it and the composite moves to the new value", async () => {
    await as("iqac@ssu.edu");
    const e = await entries.getEntry(cycleId, "X16");
    const res = await ea.reviewEntry({ entryId: e!.id, decision: "VERIFIED" });
    expect(res.ok).toBe(true);
    expect((await entries.getEntry(cycleId, "X16"))?.status).toBe("VERIFIED");
    const after = await verifiedComposite();
    const expected = composite({ ...SAMPLE, X16: 1300 } as Values, defaultConfig());
    expect(after).toBeCloseTo(expected, 6);
    expect(after).toBeGreaterThan(afterDraft);
    expect(after).not.toBeCloseTo(before, 3);
    // reviewing twice is refused
    expect((await ea.reviewEntry({ entryId: e!.id, decision: "REJECTED" })).ok).toBe(false);
  });

  it("reject sends the entry back; the contributor's next save returns it to DRAFT", async () => {
    await as("placement@ssu.edu");
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X43", value: 85 }] })).ok).toBe(true);
    expect((await ea.submitParam({ cycleId, param: "GO" })).ok).toBe(true);
    await as("iqac@ssu.edu");
    const e = await entries.getEntry(cycleId, "X43");
    expect((await ea.reviewEntry({ entryId: e!.id, decision: "REJECTED" })).ok).toBe(true);
    expect((await entries.getEntry(cycleId, "X43"))?.status).toBe("REJECTED");
    await as("placement@ssu.edu");
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X43", value: 83 }] })).ok).toBe(true);
    expect((await entries.getEntry(cycleId, "X43"))?.status).toBe("DRAFT");
    // and IQAC can set it straight
    await as("iqac@ssu.edu");
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X43", value: 82.4 }] })).ok).toBe(true);
    expect((await entries.getEntry(cycleId, "X43"))?.status).toBe("VERIFIED");
  });

  it("IQAC saves land VERIFIED; clearing a value empties the row", async () => {
    await as("iqac@ssu.edu");
    const r1 = await ea.saveEntries({ cycleId, items: [{ indicatorId: "X78", value: 50 }] });
    expect(r1.ok && r1.data[0].status).toBe("VERIFIED");
    const r2 = await ea.saveEntries({ cycleId, items: [{ indicatorId: "X78", value: null }] });
    expect(r2.ok && r2.data[0].status).toBe("EMPTY");
    const r3 = await ea.saveEntries({ cycleId, items: [{ indicatorId: "X78", value: 42 }] });
    expect(r3.ok).toBe(true);
  });
});

describe("cycle status gates", () => {
  it("contributors are frozen while IN_REVIEW, IQAC is not; both are frozen when LOCKED", async () => {
    await as("iqac@ssu.edu");
    expect((await ca.changeCycleStatus({ cycleId, status: "IN_REVIEW" })).ok).toBe(true);
    await as("research@ssu.edu");
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X17", value: 1000 }] })).ok).toBe(false);
    expect((await ea.submitParam({ cycleId, param: "RP" })).ok).toBe(false);
    await as("iqac@ssu.edu");
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X17", value: 980 }] })).ok).toBe(true);
    expect((await ca.changeCycleStatus({ cycleId, status: "LOCKED" })).ok).toBe(true);
    expect((await ea.saveEntries({ cycleId, items: [{ indicatorId: "X17", value: 981 }] })).ok).toBe(false);
    expect((await cycles.getCycle(cycleId))?.lockedAt).not.toBeNull();
    // leadership cannot manage cycles
    await as("vc@ssu.edu");
    expect((await ca.changeCycleStatus({ cycleId, status: "DRAFT" })).ok).toBe(false);
    expect((await ca.createNextCycle()).ok).toBe(false);
  });

  it("IQAC creates 2027 pre-filled from 2026 as drafts; the base year follows", async () => {
    await as("iqac@ssu.edu");
    const res = await ca.createNextCycle();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.year).toBe(2027);
    expect(res.data.status).toBe("DRAFT");
    const rows = await entries.listEntries(res.data.id);
    expect(rows).toHaveLength(64);
    const x1 = rows.find((r) => r.indicatorId === "X1");
    expect(x1?.value).toBe(6850);
    expect(x1?.status).toBe("DRAFT");
    expect(rows.every((r) => r.status === "DRAFT" || r.status === "EMPTY")).toBe(true);
    expect((await institution.getInstitution(instId))?.baseYear).toBe(2027);
    // nothing verified yet → composite is zero until departments re-confirm
    expect(await verifiedComposite(res.data.id)).toBe(0);
    // the new cycle is the active one; a second create is refused while it is open
    expect((await cycles.getActiveCycle(instId))?.id).toBe(res.data.id);
    expect((await ca.createNextCycle()).ok).toBe(false);
    // tidy: reopen 2026 as the working cycle for the remaining tests
    await db.prisma.cycle.delete({ where: { id: res.data.id } });
    await institution.updateInstitution(instId, { baseYear: 2026 });
    expect((await ca.changeCycleStatus({ cycleId, status: "DRAFT" })).ok).toBe(true);
  });
});

describe("scenarios", () => {
  it("leadership saves and deletes; contributors cannot", async () => {
    await as("vc@ssu.edu");
    const res = await sa.saveScenario({ name: "Research-first", push: { TLR: 1, RP: 2.2, GO: 0.8, OI: 0.6, PR: 1.2 } });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.createdByName).toBe("Vice-Chancellor");
    expect((await scenarios.listScenarios(cycleId)).map((s) => s.name)).toContain("Research-first");
    await as("research@ssu.edu");
    expect((await sa.saveScenario({ name: "x", push: { TLR: 1, RP: 1, GO: 1, OI: 1, PR: 1 } })).ok).toBe(false);
    expect((await sa.removeScenario({ id: res.data.id })).ok).toBe(false);
    await as("iqac@ssu.edu");
    expect((await sa.saveScenario({ name: "", push: { TLR: 1, RP: 1, GO: 1, OI: 1, PR: 1 } })).ok).toBe(false);
    expect((await sa.saveScenario({ name: "too hard", push: { TLR: 9, RP: 1, GO: 1, OI: 1, PR: 1 } })).ok).toBe(false);
    expect((await sa.removeScenario({ id: res.data.id })).ok).toBe(true);
  });
});

describe("settings and users", () => {
  it("IQAC changes goal and bands, which changes what the engine reports", async () => {
    await as("iqac@ssu.edu");
    const base = {
      name: "Sri Sri University",
      category: "overall",
      targetBand: "b50",
      baseYear: 2026,
      targetYear: 2031,
      peerBand: 1,
      sizeNorm: true,
      bands: { b200: 30, b100: 42, b50: 55, b25: 68, b10: 80 },
    };
    const res = await st.updateSettings(base);
    expect(res.ok).toBe(true);
    expect((await institution.getInstitution(instId))?.targetBand).toBe("b50");
    // invalid: non-increasing bands, target before base, bad peer
    expect((await st.updateSettings({ ...base, bands: { ...base.bands, b50: 40 } })).ok).toBe(false);
    expect((await st.updateSettings({ ...base, targetYear: 2026 })).ok).toBe(false);
    expect((await st.updateSettings({ ...base, peerBand: 0.5 })).ok).toBe(false);
    await as("vc@ssu.edu");
    expect((await st.updateSettings({ ...base, targetBand: "b10" })).ok).toBe(false);
    await as("iqac@ssu.edu");
    expect((await st.updateSettings({ ...base, targetBand: "b100" })).ok).toBe(true);
  });

  it("IQAC adds, edits and removes a contributor; cannot delete self", async () => {
    await as("iqac@ssu.edu");
    const add = await st.addUser({ email: "Exams@ssu.edu", name: "Examinations", password: "examsexams", role: "CONTRIBUTOR", ownedParams: ["GO", "TLR"] });
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    expect(add.data.email).toBe("exams@ssu.edu");
    expect(add.data.ownedParams).toEqual(["GO", "TLR"]);
    expect((await st.addUser({ email: "exams@ssu.edu", name: "Dup", password: "examsexams", role: "CONTRIBUTOR", ownedParams: [] })).ok).toBe(false);
    expect((await st.addUser({ email: "short@ssu.edu", name: "Short", password: "short", role: "CONTRIBUTOR", ownedParams: [] })).ok).toBe(false);
    const u = await users.findUserByEmail("exams@ssu.edu");
    expect(await users.verifyPassword(u!, "examsexams")).toBe(true);
    const edit = await st.editUser({ id: add.data.id, role: "LEADERSHIP", ownedParams: ["RP"], password: "newpassword1" });
    expect(edit.ok && edit.data.role).toBe("LEADERSHIP");
    expect(edit.ok && edit.data.ownedParams).toEqual([]); // non-contributors own nothing
    expect(await users.verifyPassword((await users.findUserByEmail("exams@ssu.edu"))!, "newpassword1")).toBe(true);
    expect((await st.removeUser({ id: actors["iqac@ssu.edu"].id })).ok).toBe(false);
    expect((await st.editUser({ id: actors["iqac@ssu.edu"].id, role: "CONTRIBUTOR" })).ok).toBe(false);
    expect((await st.removeUser({ id: add.data.id })).ok).toBe(true);
    expect(await users.findUserByEmail("exams@ssu.edu")).toBeNull();
    await as("vc@ssu.edu");
    expect((await st.addUser({ email: "x@ssu.edu", name: "X", password: "xxxxxxxx", role: "IQAC", ownedParams: [] })).ok).toBe(false);
  });
});
