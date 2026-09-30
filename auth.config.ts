import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe part of the Auth.js configuration: no Prisma, no bcrypt. The
 * middleware imports this; auth.ts adds the Credentials provider on top.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const signedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login")) {
        return signedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      }
      return signedIn;
    },
  },
};
