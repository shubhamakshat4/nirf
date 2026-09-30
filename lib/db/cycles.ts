import { prisma } from "./client";
import { isCycleStatus, type CycleRecord, type CycleStatus } from "./types";
import { ENTERABLE_IDS } from "@/lib/engine";

type Row = {
  id: string;
  institutionId: string;
  year: number;
  status: string;
  lockedAt: Date | null;
  createdAt: Date;
};

function toRecord(r: Row): CycleRecord {
  return {
    id: r.id,
    institutionId: r.institutionId,
    year: r.year,
    status: isCycleStatus(r.status) ? r.status : "DRAFT",
    lockedAt: r.lockedAt ? r.lockedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listCycles(institutionId: string): Promise<CycleRecord[]> {
  const rows = await prisma.cycle.findMany({ where: { institutionId }, orderBy: { year: "asc" } });
  return rows.map(toRecord);
}

export async function getCycle(id: string): Promise<CycleRecord | null> {
  const r = await prisma.cycle.findUnique({ where: { id } });
  return r ? toRecord(r) : null;
}

/** The cycle everyone is working in: the newest open one, else the newest of all. */
export async function getActiveCycle(institutionId: string): Promise<CycleRecord | null> {
  const open = await prisma.cycle.findFirst({
    where: { institutionId, status: { not: "LOCKED" } },
    orderBy: { year: "desc" },
  });
  if (open) return toRecord(open);
  const latest = await prisma.cycle.findFirst({ where: { institutionId }, orderBy: { year: "desc" } });
  return latest ? toRecord(latest) : null;
}

/** The most recent LOCKED cycle before the given year — the "last cycle" a review diffs against. */
export async function getPreviousCycle(institutionId: string, year: number): Promise<CycleRecord | null> {
  const r = await prisma.cycle.findFirst({
    where: { institutionId, year: { lt: year } },
    orderBy: { year: "desc" },
  });
  return r ? toRecord(r) : null;
}

/** Create a cycle with one EMPTY entry per enterable indicator. */
export async function createCycle(institutionId: string, year: number): Promise<CycleRecord> {
  const r = await prisma.cycle.create({
    data: {
      institutionId,
      year,
      status: "DRAFT",
      entries: { create: ENTERABLE_IDS.map((indicatorId) => ({ indicatorId, status: "EMPTY" })) },
    },
  });
  return toRecord(r);
}

/**
 * Create next year's cycle pre-filled from the given one. Values, notes and
 * evidence links carry over as DRAFT so each department re-confirms them.
 */
export async function createNextCycleFrom(fromCycleId: string): Promise<CycleRecord> {
  const from = await prisma.cycle.findUniqueOrThrow({ where: { id: fromCycleId }, include: { entries: true } });
  const byId = new Map(from.entries.map((e) => [e.indicatorId, e]));
  const r = await prisma.cycle.create({
    data: {
      institutionId: from.institutionId,
      year: from.year + 1,
      status: "DRAFT",
      entries: {
        create: ENTERABLE_IDS.map((indicatorId) => {
          const prev = byId.get(indicatorId);
          const hasValue = prev?.value !== null && prev?.value !== undefined;
          return {
            indicatorId,
            value: hasValue ? prev!.value : null,
            note: prev?.note ?? null,
            evidenceUrl: prev?.evidenceUrl ?? null,
            status: hasValue ? "DRAFT" : "EMPTY",
          };
        }),
      },
    },
  });
  return toRecord(r);
}

export async function setCycleStatus(id: string, status: CycleStatus): Promise<CycleRecord> {
  const r = await prisma.cycle.update({
    where: { id },
    data: { status, lockedAt: status === "LOCKED" ? new Date() : null },
  });
  return toRecord(r);
}

export async function getLatestCycle(institutionId: string): Promise<CycleRecord | null> {
  const r = await prisma.cycle.findFirst({ where: { institutionId }, orderBy: { year: "desc" } });
  return r ? toRecord(r) : null;
}
