"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeCycleStatus, createNextCycle } from "@/lib/actions/cycles";
import type { CycleStatus } from "@/lib/db/types";

export function CycleActions({
  cycleId,
  status,
  year,
  createDisabled,
  createHint,
}: {
  cycleId: string | null;
  status: CycleStatus | null;
  year: number | null;
  createDisabled?: boolean;
  createHint?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(to: CycleStatus) {
    if (!cycleId) return;
    if (to === "LOCKED" && !window.confirm(`Lock cycle ${year}? Contributors and IQAC can no longer edit its values.`)) return;
    if (status === "LOCKED" && to === "DRAFT" && !window.confirm(`Reopen locked cycle ${year} for editing?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await changeCycleStatus({ cycleId, status: to });
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function create() {
    if (!window.confirm(`Create cycle ${year !== null ? year + 1 : ""} pre-filled from ${year}? The base year moves to the new cycle.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await createNextCycle();
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  if (cycleId === null) {
    return (
      <div className="row">
        <button type="button" className="btn" disabled={pending || createDisabled} onClick={create}>
          Create cycle {year !== null ? year + 1 : ""} from {year ?? "latest"}
        </button>
        {createHint ? <span className="help" style={{ marginTop: 0 }}>{createHint}</span> : null}
        {error ? (
          <span className="formerr" role="alert" style={{ marginTop: 0 }}>
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="row" style={{ flexWrap: "nowrap" }}>
      {status === "DRAFT" ? (
        <button type="button" className="tinybtn" disabled={pending} onClick={() => move("IN_REVIEW")}>
          Send to review
        </button>
      ) : null}
      {status === "IN_REVIEW" ? (
        <button type="button" className="tinybtn" disabled={pending} onClick={() => move("DRAFT")}>
          Reopen drafts
        </button>
      ) : null}
      {status !== "LOCKED" ? (
        <button type="button" className="tinybtn" disabled={pending} onClick={() => move("LOCKED")}>
          Lock
        </button>
      ) : (
        <button type="button" className="tinybtn danger" disabled={pending} onClick={() => move("DRAFT")}>
          Reopen
        </button>
      )}
      {error ? (
        <span className="formerr" role="alert" style={{ marginTop: 0 }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
