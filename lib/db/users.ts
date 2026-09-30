import bcrypt from "bcryptjs";
import { prisma } from "./client";
import { isRole, parseOwnedParams, type Role, type UserRecord } from "./types";
import type { Param } from "@/lib/engine";

type Row = {
  id: string;
  email: string;
  name: string;
  role: string;
  institutionId: string;
  ownedParams: string;
};

function toRecord(r: Row): UserRecord {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: isRole(r.role) ? r.role : "CONTRIBUTOR",
    institutionId: r.institutionId,
    ownedParams: parseOwnedParams(r.ownedParams),
  };
}

export async function findUserByEmail(email: string): Promise<(UserRecord & { passwordHash: string }) | null> {
  const r = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  return r ? { ...toRecord(r), passwordHash: r.passwordHash } : null;
}

export async function getUser(id: string): Promise<UserRecord | null> {
  const r = await prisma.user.findUnique({ where: { id } });
  return r ? toRecord(r) : null;
}

export async function listUsers(institutionId: string): Promise<UserRecord[]> {
  const rows = await prisma.user.findMany({ where: { institutionId }, orderBy: [{ role: "asc" }, { email: "asc" }] });
  return rows.map(toRecord);
}

export async function verifyPassword(user: { passwordHash: string }, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function createUser(input: {
  institutionId: string;
  email: string;
  name: string;
  password: string;
  role: Role;
  ownedParams: Param[];
}): Promise<UserRecord> {
  const r = await prisma.user.create({
    data: {
      institutionId: input.institutionId,
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      passwordHash: await hashPassword(input.password),
      role: input.role,
      ownedParams: input.ownedParams.join(","),
    },
  });
  return toRecord(r);
}

export async function updateUser(
  id: string,
  input: { name?: string; role?: Role; ownedParams?: Param[]; password?: string },
): Promise<UserRecord> {
  const r = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.ownedParams !== undefined ? { ownedParams: input.ownedParams.join(",") } : {}),
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  });
  return toRecord(r);
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}
