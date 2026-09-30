import { prisma } from "./client";
import { isEntryStatus, type EntryRecord, type EntryStatus } from "./types";
import { isIndicatorId, type IndicatorId, type Param, type Values, IND_BY_ID } from "@/lib/engine";

type Row = {
  id: string;
  cycleId: string;
  indicatorId: string;
  value: number | null;
  note: string | null;
  evidenceUrl: string | null;
  status: string;
  updatedById: string | null;
  updatedAt: Date;
  updatedBy?: { name: string } | null;
};

function toRecord(r: Row): EntryRecord | null {
  if (!isIndicatorId(r.indicatorId)) return null;
  return {
    id: r.id,
    cycleId: r.cycleId,
    indicatorId: r.indicatorId,
    value: r.value,
    note: r.note,
    evidenceUrl: r.evidenceUrl,
    status: isEntryStatus(r.status) ? r.status : "EMPTY",
    updatedById: r.updatedById,
    updatedByName: r.updatedBy?.name ?? null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

const include = { updatedBy: { select: { name: true } } } as const;

export async function listEntries(cycleId: string): Promise<EntryRecord[]> {
  const rows = await prisma.entry.findMany({ where: { cycleId }, include, orderBy: { indicatorId: "asc" } });
  return rows.map(toRecord).filter((e): e is EntryRecord => e !== null);
}

export async function listEntriesByStatus(cycleId: string, status: EntryStatus): Promise<EntryRecord[]> {
  const rows = await prisma.entry.findMany({ where: { cycleId, status }, include, orderBy: { updatedAt: "asc" } });
  return rows.map(toRecord).filter((e): e is EntryRecord => e !== null);
}

export async function getEntry(cycleId: string, indicatorId: IndicatorId): Promise<EntryRecord | null> {
  const r = await prisma.entry.findUnique({ where: { cycleId_indicatorId: { cycleId, indicatorId } }, include });
  return r ? toRecord(r) : null;
}

export async function getEntryById(id: string): Promise<EntryRecord | null> {
  const r = await prisma.entry.findUnique({ where: { id }, include });
  return r ? toRecord(r) : null;
}

export type EntryPatch = {
  value?: number | null;
  note?: string | null;
  evidenceUrl?: string | null;
};

/**
 * Write one entry, appending an EntryLog row whenever the value changes.
 * `status` is decided by the caller (the action layer knows the role).
 */
export async function upsertEntry(
  cycleId: string,
  indicatorId: IndicatorId,
  patch: EntryPatch,
  status: EntryStatus,
  userId: string,
): Promise<EntryRecord> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.entry.findUnique({ where: { cycleId_indicatorId: { cycleId, indicatorId } } });
    const oldValue = existing?.value ?? null;
    const newValue = patch.value === undefined ? oldValue : patch.value;
    const data = {
      ...(patch.value !== undefined ? { value: patch.value } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.evidenceUrl !== undefined ? { evidenceUrl: patch.evidenceUrl } : {}),
      status,
      updatedById: userId,
    };
    const row = existing
      ? await tx.entry.update({ where: { id: existing.id }, data, include })
      : await tx.entry.create({ data: { cycleId, indicatorId, ...data }, include });
    if (oldValue !== newValue) {
      await tx.entryLog.create({ data: { entryId: row.id, oldValue, newValue, userId } });
    }
    const rec = toRecord(row);
    if (!rec) throw new Error("Unknown indicator");
    return rec;
  });
}

export async function setEntryStatus(id: string, status: EntryStatus, userId: string): Promise<EntryRecord> {
  const row = await prisma.entry.update({ where: { id }, data: { status, updatedById: userId }, include });
  const rec = toRecord(row);
  if (!rec) throw new Error("Unknown indicator");
  return rec;
}

/** Move every DRAFT/REJECTED entry with a value in the given parameters to SUBMITTED. */
export async function submitEntries(cycleId: string, params: Param[], userId: string): Promise<number> {
  const rows = await prisma.entry.findMany({
    where: { cycleId, status: { in: ["DRAFT", "REJECTED"] }, value: { not: null } },
  });
  const ids = rows
    .filter((r) => isIndicatorId(r.indicatorId) && params.includes(IND_BY_ID[r.indicatorId].p))
    .map((r) => r.id);
  if (!ids.length) return 0;
  const res = await prisma.entry.updateMany({
    where: { id: { in: ids } },
    data: { status: "SUBMITTED", updatedById: userId },
  });
  return res.count;
}

export type EntryLogRecord = {
  id: string;
  entryId: string;
  oldValue: number | null;
  newValue: number | null;
  userId: string;
  userName: string;
  at: string;
};

export async function listEntryLogs(entryId: string, limit = 10): Promise<EntryLogRecord[]> {
  const rows = await prisma.entryLog.findMany({
    where: { entryId },
    orderBy: { at: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    entryId: r.entryId,
    oldValue: r.oldValue,
    newValue: r.newValue,
    userId: r.userId,
    userName: r.user.name,
    at: r.at.toISOString(),
  }));
}

/**
 * Turn entries into the engine's Values map. Only VERIFIED values count as
 * evidenced — an unverified number is a claim, not data, and scores zero.
 */
export function valuesFromEntries(entries: readonly EntryRecord[], opts: { onlyVerified?: boolean } = {}): Values {
  const onlyVerified = opts.onlyVerified ?? true;
  const out: Values = {};
  for (const e of entries) {
    if (e.value === null) continue;
    if (onlyVerified && e.status !== "VERIFIED") continue;
    out[e.indicatorId] = e.value;
  }
  return out;
}
