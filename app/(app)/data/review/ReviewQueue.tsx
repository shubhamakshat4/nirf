"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewEntry } from "@/lib/actions/entries";
import type { EntryRecord } from "@/lib/db/types";
import { fmt, type Param } from "@/lib/engine";

export type ReviewRow = {
  entry: EntryRecord;
  name: string;
  param: Param;
  unit: string;
  weight: number;
  prevValue: number | null;
};

export function ReviewQueue({ rows, prevYear, canReview }: { rows: ReviewRow[]; prevYear: number | null; canReview: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function decide(id: string, decision: "VERIFIED" | "REJECTED") {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const res = await reviewEntry({ entryId: id, decision });
      if (!res.ok) setError(res.error);
      setBusyId(null);
      router.refresh();
    });
  }

  if (!rows.length) return <p className="help">The queue is empty.</p>;

  return (
    <div className="tablewrap">
      {error ? (
        <p className="formerr" role="alert">
          {error}
        </p>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Indicator</th>
            <th className="n">Submitted</th>
            <th className="n">{prevYear ? `${prevYear} cycle` : "Last cycle"}</th>
            <th className="n">Change</th>
            <th>Note and evidence</th>
            <th>By</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const e = r.entry;
            const v = e.value;
            const d = v !== null && r.prevValue !== null ? v - r.prevValue : null;
            const pct = d !== null && r.prevValue ? (100 * d) / Math.abs(r.prevValue) : null;
            return (
              <tr key={e.id}>
                <td>
                  <strong>{r.name}</strong> <span className="muted">{e.indicatorId}</span>
                  <br />
                  <span className="small muted">
                    {r.param} · weight {r.weight}% · {r.unit}
                  </span>
                </td>
                <td className="n">{v === null ? "—" : fmt(v)}</td>
                <td className="n">{r.prevValue === null ? "—" : fmt(r.prevValue)}</td>
                <td className={`n ${d === null ? "" : d >= 0 ? "diff-up" : "diff-down"}`}>
                  {d === null ? "—" : `${d >= 0 ? "+" : ""}${fmt(d)}${pct !== null ? ` (${pct >= 0 ? "+" : ""}${fmt(pct, 0)}%)` : ""}`}
                </td>
                <td>
                  {e.note ? <div>{e.note}</div> : <span className="muted">no note</span>}
                  {e.evidenceUrl ? (
                    <a href={e.evidenceUrl} target="_blank" rel="noreferrer" className="small">
                      evidence ↗
                    </a>
                  ) : (
                    <span className="small" style={{ color: "var(--clay)" }}>
                      no evidence link
                    </span>
                  )}
                </td>
                <td className="small muted">{e.updatedByName ?? "—"}</td>
                <td>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <button type="button" className="btn sm" disabled={!canReview || pending} onClick={() => decide(e.id, "VERIFIED")}>
                      {busyId === e.id ? "…" : "Verify"}
                    </button>
                    <button type="button" className="btn sm ghost" disabled={!canReview || pending} onClick={() => decide(e.id, "REJECTED")}>
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
