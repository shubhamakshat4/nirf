"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";

const zLogin = z.object({
  email: z.string().trim().email("Enter a valid email address").max(200),
  password: z.string().min(1, "Enter your password").max(200),
});

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = zLogin.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
    return {};
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: e.type === "CredentialsSignin" ? "Email or password is incorrect." : "Could not sign in. Try again." };
    }
    // Next.js implements redirects by throwing; let those through.
    throw e;
  }
}
