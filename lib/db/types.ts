import { z } from "zod";
import {
  BAND_KEYS,
  CATEGORY_KEYS,
  ENTERABLE_IDS,
  PKEYS,
  isBandKey,
  isCategoryKey,
  isIndicatorId,
  isParam,
  type BandKey,
  type Bands,
  type CategoryKey,
  type EngineConfig,
  type IndicatorId,
  type Param,
  type Push,
} from "@/lib/engine";

/* ---------- status vocabularies (strings in the DB, unions in TS) ---------- */

export const ROLES = ["CONTRIBUTOR", "IQAC", "LEADERSHIP"] as const;
export type Role = (typeof ROLES)[number];
export const isRole = (x: string): x is Role => (ROLES as readonly string[]).includes(x);

export const CYCLE_STATUSES = ["DRAFT", "IN_REVIEW", "LOCKED"] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];
export const isCycleStatus = (x: string): x is CycleStatus =>
  (CYCLE_STATUSES as readonly string[]).includes(x);

export const ENTRY_STATUSES = ["EMPTY", "DRAFT", "SUBMITTED", "VERIFIED", "REJECTED"] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];
export const isEntryStatus = (x: string): x is EntryStatus =>
  (ENTRY_STATUSES as readonly string[]).includes(x);

/* ---------- Zod schemas shared by actions and route handlers ---------- */

export const zRole = z.enum(ROLES);
export const zCycleStatus = z.enum(CYCLE_STATUSES);
export const zEntryStatus = z.enum(ENTRY_STATUSES);
export const zParam = z.enum(PKEYS as unknown as [Param, ...Param[]]);
export const zBandKey = z.enum(BAND_KEYS as unknown as [BandKey, ...BandKey[]]);
export const zCategoryKey = z.enum(CATEGORY_KEYS as unknown as [CategoryKey, ...CategoryKey[]]);
export const zIndicatorId = z.string().refine(isIndicatorId, "Unknown indicator");
export const zEnterableId = z
  .string()
  .refine((x): x is IndicatorId => isIndicatorId(x) && (ENTERABLE_IDS as readonly string[]).includes(x), {
    message: "Not an enterable indicator",
  });
export const zId = z.string().min(1).max(64);
export const zPush = z.object({
  TLR: z.number().min(0).max(6),
  RP: z.number().min(0).max(6),
  GO: z.number().min(0).max(6),
  OI: z.number().min(0).max(6),
  PR: z.number().min(0).max(6),
});
export const zBands = z.object({
  b200: z.number().min(0).max(100),
  b100: z.number().min(0).max(100),
  b50: z.number().min(0).max(100),
  b25: z.number().min(0).max(100),
  b10: z.number().min(0).max(100),
});

/* ---------- plain records passed from server to client ---------- */

export type InstitutionRecord = {
  id: string;
  name: string;
  category: CategoryKey;
  baseYear: number;
  targetYear: number;
  targetBand: BandKey;
  peerBand: number;
  sizeNorm: boolean;
  bands: Bands;
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: Role;
  institutionId: string;
  ownedParams: Param[];
};

export type CycleRecord = {
  id: string;
  institutionId: string;
  year: number;
  status: CycleStatus;
  lockedAt: string | null;
  createdAt: string;
};

export type EntryRecord = {
  id: string;
  cycleId: string;
  indicatorId: IndicatorId;
  value: number | null;
  note: string | null;
  evidenceUrl: string | null;
  status: EntryStatus;
  updatedById: string | null;
  updatedByName: string | null;
  updatedAt: string;
};

export type ScenarioRecord = {
  id: string;
  cycleId: string;
  name: string;
  push: Push;
  createdById: string;
  createdByName: string;
  createdAt: string;
};

/* ---------- parsers from raw Prisma rows ---------- */

export function parseOwnedParams(csv: string): Param[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(isParam);
}

export function parseBands(json: unknown): Bands {
  const r = zBands.safeParse(json);
  if (r.success) return r.data;
  return { b200: 30, b100: 42, b50: 55, b25: 68, b10: 80 };
}

export function parsePush(json: unknown): Push {
  const r = zPush.safeParse(json);
  if (r.success) return r.data;
  return { TLR: 1, RP: 1, GO: 1, OI: 1, PR: 1 };
}

export function engineConfigOf(inst: InstitutionRecord): EngineConfig {
  return {
    category: inst.category,
    goal: inst.targetBand,
    bands: inst.bands,
    peer: inst.peerBand,
    sizeNorm: inst.sizeNorm,
    baseYear: inst.baseYear,
    targetYear: inst.targetYear,
  };
}

export function toCategoryKey(x: string): CategoryKey {
  return isCategoryKey(x) ? x : "overall";
}
export function toBandKey(x: string): BandKey {
  return isBandKey(x) ? x : "b100";
}
