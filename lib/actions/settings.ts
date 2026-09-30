"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCan } from "@/lib/auth/can";
import { requireActorOrThrow } from "@/lib/auth/session";
import { updateInstitution } from "@/lib/db/institution";
import { createUser, deleteUser, getUser, listUsers, updateUser } from "@/lib/db/users";
import { zBandKey, zBands, zCategoryKey, zId, zParam, zRole, type InstitutionRecord, type UserRecord } from "@/lib/db/types";
import { fail, guard, ok, type ActionResult } from "./result";

const zSettings = z
  .object({
    name: z.string().trim().min(2).max(120),
    category: zCategoryKey,
    targetBand: zBandKey,
    baseYear: z.coerce.number().int().min(2020).max(2040),
    targetYear: z.coerce.number().int().min(2021).max(2045),
    peerBand: z.coerce.number().refine((v) => [1, 0.8, 0.62].includes(v), "Peer band must be 1, 0.8 or 0.62"),
    sizeNorm: z.coerce.boolean(),
    bands: zBands,
  })
  .refine((s) => s.targetYear > s.baseYear, { message: "Target year must be after the base year", path: ["targetYear"] })
  .refine((s) => s.bands.b200 < s.bands.b100 && s.bands.b100 < s.bands.b50 && s.bands.b50 < s.bands.b25 && s.bands.b25 < s.bands.b10, {
    message: "Band thresholds must increase from Ranked to Top 10",
    path: ["bands"],
  });

export type SettingsInput = z.input<typeof zSettings>;

export async function updateSettings(raw: unknown): Promise<ActionResult<InstitutionRecord>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    assertCan(actor, { type: "settings:manage" });
    const s = zSettings.parse(raw);
    const inst = await updateInstitution(actor.institutionId, s);
    revalidatePath("/", "layout");
    return ok(inst);
  });
}

/* ---------- users ---------- */

const zNewUser = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  role: zRole,
  ownedParams: z.array(zParam).max(5),
});

export async function addUser(raw: unknown): Promise<ActionResult<UserRecord>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    assertCan(actor, { type: "users:manage" });
    const u = zNewUser.parse(raw);
    const existing = (await listUsers(actor.institutionId)).find((x) => x.email === u.email.toLowerCase());
    if (existing) return fail("A user with that email already exists");
    const created = await createUser({ ...u, institutionId: actor.institutionId, ownedParams: u.role === "CONTRIBUTOR" ? u.ownedParams : [] });
    revalidatePath("/settings");
    return ok(created);
  });
}

const zEditUser = z.object({
  id: zId,
  name: z.string().trim().min(2).max(120).optional(),
  role: zRole.optional(),
  ownedParams: z.array(zParam).max(5).optional(),
  password: z.union([z.literal(""), z.string().min(8, "Password must be at least 8 characters").max(200)]).optional(),
});

export async function editUser(raw: unknown): Promise<ActionResult<UserRecord>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    assertCan(actor, { type: "users:manage" });
    const u = zEditUser.parse(raw);
    const target = await getUser(u.id);
    if (!target || target.institutionId !== actor.institutionId) return fail("User not found");
    if (target.id === actor.id && u.role && u.role !== "IQAC") return fail("You cannot remove your own IQAC role");
    const role = u.role ?? target.role;
    const updated = await updateUser(u.id, {
      name: u.name,
      role: u.role,
      ownedParams: role === "CONTRIBUTOR" ? (u.ownedParams ?? target.ownedParams) : [],
      password: u.password || undefined,
    });
    revalidatePath("/settings");
    return ok(updated);
  });
}

export async function removeUser(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const actor = await requireActorOrThrow();
    assertCan(actor, { type: "users:manage" });
    const { id } = z.object({ id: zId }).parse(raw);
    if (id === actor.id) return fail("You cannot delete your own account");
    const target = await getUser(id);
    if (!target || target.institutionId !== actor.institutionId) return fail("User not found");
    await deleteUser(id);
    revalidatePath("/settings");
    return ok({ id });
  });
}
