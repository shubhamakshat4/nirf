import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Actor } from "./can";
import { isRole } from "@/lib/db/types";
import { isParam } from "@/lib/engine";

/** The signed-in actor, or null. Cached per request. */
export const currentActor = cache(async (): Promise<(Actor & { email: string; name: string }) | null> => {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !isRole(u.role) || !u.institutionId) return null;
  return {
    id: u.id,
    role: u.role,
    institutionId: u.institutionId,
    ownedParams: (u.ownedParams ?? []).filter(isParam),
    email: u.email ?? "",
    name: u.name ?? "",
  };
});

/** For server components: redirect to /login when signed out. */
export async function requireActor(): Promise<Actor & { email: string; name: string }> {
  const a = await currentActor();
  if (!a) redirect("/login");
  return a;
}

/** For server actions: throw instead of redirecting. */
export async function requireActorOrThrow(): Promise<Actor & { email: string; name: string }> {
  const a = await currentActor();
  if (!a) throw new Error("Not signed in");
  return a;
}
