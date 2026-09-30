import { ForbiddenError } from "@/lib/auth/can";
import { ZodError } from "zod";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** Turn thrown errors into a result the client can show. Redirect errors are re-thrown. */
export async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    if (e instanceof ZodError) return fail(e.issues.map((i) => i.message).join("; "));
    if (e instanceof Error) {
      if (e.message === "NEXT_REDIRECT" || /NEXT_REDIRECT/.test(String((e as { digest?: string }).digest ?? ""))) throw e;
      return fail(e.message || "Something went wrong");
    }
    return fail("Something went wrong");
  }
}
