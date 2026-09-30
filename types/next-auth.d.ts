import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/db/types";
import type { Param } from "@/lib/engine";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      institutionId: string;
      ownedParams: Param[];
    } & DefaultSession["user"];
  }
  interface User {
    id?: string;
    role: Role;
    institutionId: string;
    ownedParams: Param[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    institutionId: string;
    ownedParams: Param[];
  }
}

// next-auth/jwt re-exports from @auth/core/jwt with `export *`, which does not
// carry interface merging through, so the JWT shape is augmented at its source.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    institutionId: string;
    ownedParams: Param[];
  }
}
