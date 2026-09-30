import { prisma } from "./client";
import { parsePush, type ScenarioRecord } from "./types";
import type { Push } from "@/lib/engine";

type Row = {
  id: string;
  cycleId: string;
  name: string;
  push: unknown;
  createdById: string;
  createdAt: Date;
  createdBy: { name: string };
};

function toRecord(r: Row): ScenarioRecord {
  return {
    id: r.id,
    cycleId: r.cycleId,
    name: r.name,
    push: parsePush(r.push),
    createdById: r.createdById,
    createdByName: r.createdBy.name,
    createdAt: r.createdAt.toISOString(),
  };
}

const include = { createdBy: { select: { name: true } } } as const;

export async function listScenarios(cycleId: string): Promise<ScenarioRecord[]> {
  const rows = await prisma.scenario.findMany({ where: { cycleId }, include, orderBy: { createdAt: "asc" } });
  return rows.map(toRecord);
}

export async function getScenario(id: string): Promise<ScenarioRecord | null> {
  const r = await prisma.scenario.findUnique({ where: { id }, include });
  return r ? toRecord(r) : null;
}

export async function createScenario(cycleId: string, name: string, push: Push, createdById: string): Promise<ScenarioRecord> {
  const r = await prisma.scenario.create({ data: { cycleId, name, push, createdById }, include });
  return toRecord(r);
}

export async function deleteScenario(id: string): Promise<void> {
  await prisma.scenario.delete({ where: { id } });
}
