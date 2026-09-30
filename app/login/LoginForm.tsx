"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} noValidate>
      <label className="field">
        <span className="lab">
          <span>Email</span>
        </span>
        <input type="email" name="email" autoComplete="username" required defaultValue="" />
      </label>
      <label className="field">
        <span className="lab">
          <span>Password</span>
        </span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state.error ? (
        <p className="formerr" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
