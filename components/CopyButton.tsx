"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "blocked">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
      setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("blocked");
    }
  }
  return (
    <button type="button" className="btn ghost" onClick={copy}>
      {state === "done" ? "Copied" : state === "blocked" ? "Copy blocked by browser" : label}
    </button>
  );
}
