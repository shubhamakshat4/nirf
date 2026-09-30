"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEntries, submitParam } from "@/lib/actions/entries";
import type { CycleStatus, EntryRecord, Role } from "@/lib/db/types";
import {
  ACCRED,
  CATEGORIES,
  IND,
  PARAM_NAMES,
  fmt,
  norm,
  withDerived,
  type CategoryKey,
  type Indicator,
  type IndicatorId,
  type Param,
  type Values,
} from "@/lib/engine";
import { StatusChip } from "@/components/StatusChip";

type Edit = { value: string; note: string; evidenceUrl: string };

export type DataFormProps = {
  cycleId: string;
  cycleStatus: CycleStatus;
  role: Role;
  params: Param[];
  entries: EntryRecord[];
  baseValues: Values;
  cfg: { peer: number; sizeNorm: boolean; category: CategoryKey };
  editable: Partial<Record<IndicatorId, boolean>>;
  submittable: Param[];
  showScores: boolean;
};

function toEdit(e: EntryRecord | undefined): Edit {
  return { value: e?.value === null || e?.value === undefined ? "" : String(e.value), note: e?.note ?? "", evidenceUrl: e?.evidenceUrl ?? "" };
}

function meterColor(n: number): string {
  return n >= 70 ? "var(--seal)" : n >= 35 ? "var(--ochre)" : "var(--clay)";
}

function whenLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function DataForm(props: DataFormProps) {
  const { cycleId, cycleStatus, params, entries, baseValues, cfg, editable, submittable, showScores } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [edits, setEdits] = useState<Partial<Record<IndicatorId, Edit>>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; param?: Param } | null>(null);

  const byId = useMemo(() => new Map(entries.map((e) => [e.indicatorId, e])), [entries]);

  // Live values: what is stored, overlaid with what is being typed.
  const live = useMemo(() => {
    const v: Values = { ...baseValues };
    for (const [id, ed] of Object.entries(edits) as [IndicatorId, Edit][]) {
      if (ed.value === "") delete v[id];
      else {
        const n = Number(ed.value);
        if (Number.isFinite(n)) v[id] = n;
      }
    }
    return v;
  }, [baseValues, edits]);
  const derived = useMemo(() => withDerived(live), [live]);
  const students = derived.X1 || 0;

  const paramScore = (p: Param) => IND.filter((i) => i.p === p).reduce((a, i) => a + (i.w / 100) * norm(i, derived[i.id] || 0, students, cfg), 0);

  function edit(id: IndicatorId, patch: Partial<Edit>) {
    setEdits((prev) => {
      const cur = prev[id] ?? toEdit(byId.get(id));
      const next = { ...cur, ...patch };
      const orig = toEdit(byId.get(id));
      const same = next.value === orig.value && next.note === orig.note && next.evidenceUrl === orig.evidenceUrl;
      const out = { ...prev };
      if (same) delete out[id];
      else out[id] = next;
      return out;
    });
  }

  function dirtyIn(p: Param): IndicatorId[] {
    return (Object.keys(edits) as IndicatorId[]).filter((id) => IND.find((i) => i.id === id)?.p === p);
  }

  function save(p: Param) {
    const ids = dirtyIn(p);
    if (!ids.length) return;
    const items = ids.map((id) => {
      const ed = edits[id]!;
      const value = ed.value.trim() === "" ? null : Number(ed.value);
      return { indicatorId: id, value, note: ed.note.trim(), evidenceUrl: ed.evidenceUrl.trim() };
    });
    const bad = items.find((it) => it.value !== null && !Number.isFinite(it.value));
    if (bad) {
      setMsg({ kind: "err", text: `${bad.indicatorId}: enter a number`, param: p });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await saveEntries({ cycleId, items });
      if (res.ok) {
        setEdits((prev) => {
          const out = { ...prev };
          for (const id of ids) delete out[id];
          return out;
        });
        setMsg({ kind: "ok", text: `Saved ${res.data.length} ${res.data.length === 1 ? "entry" : "entries"}`, param: p });
        router.refresh();
      } else setMsg({ kind: "err", text: res.error, param: p });
    });
  }

  function submit(p: Param) {
    if (dirtyIn(p).length) {
      setMsg({ kind: "err", text: "Save your changes before submitting", param: p });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await submitParam({ cycleId, param: p });
      if (res.ok) {
        setMsg({ kind: "ok", text: res.data.count ? `Submitted ${res.data.count} entries to IQAC` : "Nothing to submit — no drafts with a value", param: p });
        router.refresh();
      } else setMsg({ kind: "err", text: res.error, param: p });
    });
  }

  return (
    <div>
      {params.map((p) => {
        const inds = IND.filter((i) => i.p === p);
        const dirty = dirtyIn(p).length;
        const anyEditable = inds.some((i) => editable[i.id]);
        const pendingSubmit = inds.filter((i) => {
          const e = byId.get(i.id);
          return e && (e.status === "DRAFT" || e.status === "REJECTED") && e.value !== null;
        }).length;
        return (
          <section key={p} aria-labelledby={`h-${p}`}>
            <div className="indhead">
              <h3 id={`h-${p}`}>
                {p} — {PARAM_NAMES[p]}
              </h3>
              <div className="sc">
                {showScores ? `score ${fmt(paramScore(p), 1)} / 100 · w ${Math.round(CATEGORIES[cfg.category].w[p] * 100)}%` : `${inds.filter((i) => !i.der).length} enterable · ${inds.filter((i) => i.der).length} derived`}
              </div>
            </div>
            {inds.map((ind) => (
              <Row
                key={ind.id}
                ind={ind}
                entry={byId.get(ind.id)}
                edit={edits[ind.id]}
                onEdit={(patch) => edit(ind.id, patch)}
                liveValue={derived[ind.id]}
                hasLive={ind.der ? !!derived[ind.id] : live[ind.id] !== undefined}
                n={norm(ind, derived[ind.id] || 0, students, cfg)}
                editable={!!editable[ind.id]}
                busy={pending}
              />
            ))}
            {anyEditable || submittable.includes(p) ? (
              <div className="row" style={{ marginTop: 12 }}>
                {anyEditable ? (
                  <button type="button" className="btn" disabled={!dirty || pending} onClick={() => save(p)}>
                    {pending ? "Saving…" : dirty ? `Save ${dirty} change${dirty === 1 ? "" : "s"}` : "Saved"}
                  </button>
                ) : null}
                {submittable.includes(p) ? (
                  <button type="button" className="btn ghost" disabled={pending || !pendingSubmit} onClick={() => submit(p)}>
                    Submit {pendingSubmit ? `${pendingSubmit} ` : ""}to IQAC
                  </button>
                ) : null}
                {msg && msg.param === p ? (
                  <span className={msg.kind === "ok" ? "formok" : "formerr"} role="status" style={{ marginTop: 0 }}>
                    {msg.text}
                  </span>
                ) : null}
                {cycleStatus !== "DRAFT" && props.role === "CONTRIBUTOR" ? (
                  <span className="help" style={{ marginTop: 0 }}>
                    Cycle is {cycleStatus.toLowerCase().replace("_", " ")} — contributors can no longer edit.
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function Row(props: {
  ind: Indicator;
  entry: EntryRecord | undefined;
  edit: Edit | undefined;
  onEdit: (patch: Partial<Edit>) => void;
  liveValue: number;
  hasLive: boolean;
  n: number;
  editable: boolean;
  busy: boolean;
}) {
  const { ind, entry, edit, onEdit, liveValue, hasLive, n, editable, busy } = props;
  const cur = edit ?? toEdit(entry);
  const inputId = `in-${ind.id}`;
  return (
    <div className={`ind${edit ? " dirty" : ""}`}>
      <div className="nm">
        <label htmlFor={ind.der ? undefined : inputId}>{ind.nm}</label>
        <em>
          {ind.id} · weight {ind.w}% · {ind.u}
          {ind.inv ? " · lower is better" : ""}
          {ind.der ? ` · computed from ${ind.der}` : ""}
        </em>
      </div>
      <div>
        {ind.der ? (
          <div className="derval" aria-label={`${ind.nm} computed value`}>
            {hasLive ? fmt(liveValue) : "—"}
          </div>
        ) : ind.sel === "accred" ? (
          <select id={inputId} value={cur.value === "" ? "" : String(Number(cur.value))} disabled={!editable || busy} onChange={(e) => onEdit({ value: e.target.value })}>
            <option value="">—</option>
            {ACCRED.map(([nm, v]) => (
              <option key={nm} value={String(v)}>
                {nm}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            placeholder="—"
            value={cur.value}
            disabled={!editable || busy}
            onChange={(e) => onEdit({ value: e.target.value })}
          />
        )}
      </div>
      <div className="meter">
        <div className="mini" aria-hidden="true">
          <i style={{ width: `${n}%`, background: meterColor(n) }} />
        </div>
        <span className="pct">{hasLive ? `${fmt(n, 0)}/100` : "no data"}</span>
      </div>
      {!ind.der ? (
        <div className="meta">
          <label className="field">
            <span className="lab">
              <span>Note / source</span>
            </span>
            <input type="text" maxLength={500} value={cur.note} disabled={!editable || busy} onChange={(e) => onEdit({ note: e.target.value })} />
          </label>
          <label className="field">
            <span className="lab">
              <span>Evidence link</span>
              {cur.evidenceUrl && /^https?:\/\//i.test(cur.evidenceUrl) ? (
                <a href={cur.evidenceUrl} target="_blank" rel="noreferrer" className="unit">
                  open ↗
                </a>
              ) : null}
            </span>
            <input type="url" maxLength={500} placeholder="https://" value={cur.evidenceUrl} disabled={!editable || busy} onChange={(e) => onEdit({ evidenceUrl: e.target.value })} />
          </label>
          <div className="who">
            <StatusChip status={entry?.status ?? "EMPTY"} />
            {entry?.updatedByName ? (
              <span>
                last edited by {entry.updatedByName}
                {entry.updatedAt ? ` · ${whenLabel(entry.updatedAt)}` : ""}
              </span>
            ) : (
              <span>never edited</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
