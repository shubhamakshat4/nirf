import type { Prisma } from "@prisma/client";
import { prisma } from "./client";
import { parseBands, toBandKey, toCategoryKey, type InstitutionRecord } from "./types";
import type { BandKey, Bands, CategoryKey } from "@/lib/engine";

type Row = {
  id: string;
  name: string;
  category: string;
  baseYear: number;
  targetYear: number;
  targetBand: string;
  peerBand: number;
  sizeNorm: boolean;
  bands: unknown;
};

function toRecord(r: Row): InstitutionRecord {
  return {
    id: r.id,
    name: r.name,
    category: toCategoryKey(r.category),
    baseYear: r.baseYear,
    targetYear: r.targetYear,
    targetBand: toBandKey(r.targetBand),
    peerBand: r.peerBand,
    sizeNorm: r.sizeNorm,
    bands: parseBands(r.bands),
  };
}

export async function getInstitution(id: string): Promise<InstitutionRecord | null> {
  const r = await prisma.institution.findUnique({ where: { id } });
  return r ? toRecord(r) : null;
}

export type InstitutionSettings = {
  name?: string;
  category?: CategoryKey;
  baseYear?: number;
  targetYear?: number;
  targetBand?: BandKey;
  peerBand?: number;
  sizeNorm?: boolean;
  bands?: Bands;
};

export async function updateInstitution(id: string, s: InstitutionSettings): Promise<InstitutionRecord> {
  const data: Prisma.InstitutionUpdateInput = {};
  if (s.name !== undefined) data.name = s.name;
  if (s.category !== undefined) data.category = s.category;
  if (s.baseYear !== undefined) data.baseYear = s.baseYear;
  if (s.targetYear !== undefined) data.targetYear = s.targetYear;
  if (s.targetBand !== undefined) data.targetBand = s.targetBand;
  if (s.peerBand !== undefined) data.peerBand = s.peerBand;
  if (s.sizeNorm !== undefined) data.sizeNorm = s.sizeNorm;
  if (s.bands !== undefined) data.bands = s.bands;
  const r = await prisma.institution.update({ where: { id }, data });
  return toRecord(r);
}
