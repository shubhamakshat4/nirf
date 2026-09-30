import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { findUserByEmail, verifyPassword } from "@/lib/db/users";

const zCredentials = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = zCredentials.safeParse(raw);
        if (!parsed.success) return null;
        const user = await findUserByEmail(parsed.data.email);
        if (!user) return null;
        const ok = await verifyPassword(user, parsed.data.password);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          institutionId: user.institutionId,
          ownedParams: user.ownedParams,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.role = user.role;
        token.institutionId = user.institutionId;
        token.ownedParams = user.ownedParams;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.institutionId = token.institutionId;
      session.user.ownedParams = token.ownedParams;
      return session;
    },
  },
});
