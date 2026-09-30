"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeScenario, saveScenario } from "@/lib/actions/scenarios";
import type { ScenarioRecord } from "@/lib/db/types";
import {
  PKEYS,
  PUSH_PRESETS,
  STEADY_PUSH,
  arrivalYear,
  bandName,
  composite,
  fmt,
  pushLabel,
  simulate,
  threshold,
  type EngineConfig,
  type Push,
  type Values,
} from "@/lib/engine";

export function ScenarioLab({
  values,
  cfg,
  scenarios,
  canWrite,
}: {
  values: Values;
  cfg: EngineConfig;
  scenarios: ScenarioRecord[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [push, setPush] = useState<Push>({ ...STEADY_PUSH });
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const t = threshold(cfg);
  const T = cfg.targetYear - cfg.baseYear;

  // The same engine module the server uses — recomputed in the browser on every slider move.
  const out = useMemo(() => {
    const arrive = arrivalYear(values, cfg, push);
    const at = T > 0 ? simulate(values, cfg, push, T)[T].score : composite(values, cfg);
    return { arrive, at };
  }, [values, cfg, push, T]);

  const rows = useMemo(
    () =>
      scenarios.map((s) => {
        const a = arrivalYear(values, cfg, s.push);
        const sc = T > 0 ? simulate(values, cfg, s.push, T)[T].score : composite(values, cfg);
        return { s, arrive: a, at: sc };
      }),
    [scenarios, values, cfg, T],
  );

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveScenario({ name: name.trim() || `Scenario ${scenarios.length + 1}`, push });
      if (res.ok) {
        setName("");
        setMsg(`Saved “${res.data.name}”`);
        router.refresh();
      } else setMsg(res.error);
    });
  }

  function del(id: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await removeScenario({ id });
      if (!res.ok) setMsg(res.error);
      router.refresh();
    });
  }

  const presetActive = (p: Push) => PKEYS.every((k) => Math.abs(p[k] - push[k]) < 1e-9);

  return (
    <>
      <div className="panel">
        <h2>Scenario lab</h2>
        <p className="lede">
          Set how hard you intend to push each parameter, then read the new arrival year. Effort costs money and attention, so pushing everything at
          once is usually the least honest scenario.
        </p>
        {PKEYS.map((p) => (
          <div className="slider" key={p}>
            <label htmlFor={`push-${p}`} className="nm" style={{ fontWeight: 600 }}>
              {p}
            </label>
            <input
              id={`push-${p}`}
              type="range"
              min={0}
              max={2.4}
              step={0.1}
              value={push[p]}
              aria-valuetext={`${pushLabel(push[p])} (${fmt(push[p], 1)}×)`}
              onChange={(e) => setPush({ ...push, [p]: Number(e.target.value) })}
            />
            <div className="val" style={{ fontSize: 13, color: "var(--muted)", textAlign: "right" }}>
              {pushLabel(push[p])} ({fmt(push[p], 1)}×)
            </div>
          </div>
        ))}
        <hr className="rule" />
        <div className="row" role="group" aria-label="Presets">
          <button type="button" className="btn ghost" aria-pressed={presetActive(STEADY_PUSH)} onClick={() => setPush({ ...STEADY_PUSH })}>
            Steady
          </button>
          {Object.entries(PUSH_PRESETS).map(([k, pr]) => (
            <button key={k} type="button" className="btn ghost" aria-pressed={presetActive(pr.push)} onClick={() => setPush({ ...pr.push })}>
              {pr.nm}
            </button>
          ))}
        </div>
        <hr className="rule" />
        <div className="grid2">
          <div className="stat">
            Arrival at {bandName(cfg.goal)}
            <div className="display">{out.arrive === null ? "beyond 20 years" : cfg.baseYear + out.arrive}</div>
          </div>
          <div className="stat">
            Score in {cfg.targetYear}
            <div className="display" style={{ color: out.at >= t ? "var(--seal)" : "var(--clay)" }}>
              {fmt(out.at, 1)}
            </div>
          </div>
          <div className="stat">
            Needed
            <div className="display">{t}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Saved scenarios</h2>
        <p className="lede">Snapshot the current settings to compare arrival years side by side. Saved scenarios are shared with everyone who can see this page.</p>
        {canWrite ? (
          <div className="row" style={{ marginBottom: 16 }}>
            <label className="field" style={{ maxWidth: 240, flex: 1 }}>
              <span className="lab">
                <span>Scenario name</span>
              </span>
              <input type="text" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Scenario ${scenarios.length + 1}`} />
            </label>
            <button type="button" className="btn" style={{ alignSelf: "end" }} disabled={pending} onClick={save}>
              Save scenario
            </button>
            {msg ? (
              <span className="small" role="status" style={{ alignSelf: "end", paddingBottom: 8 }}>
                {msg}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="tablewrap">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Push</th>
                  <th className="n">Arrival</th>
                  <th className="n">Score in {cfg.targetYear}</th>
                  <th>By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, arrive, at }) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td className="small muted">{PKEYS.map((p) => `${p} ${fmt(s.push[p], 1)}`).join(" · ")}</td>
                    <td className="n">{arrive === null ? "—" : cfg.baseYear + arrive}</td>
                    <td className="n" style={{ color: at >= t ? "var(--seal)" : "var(--clay)" }}>
                      {fmt(at, 1)}
                    </td>
                    <td className="small muted">{s.createdByName}</td>
                    <td>
                      <div className="row" style={{ flexWrap: "nowrap" }}>
                        <button type="button" className="tinybtn" onClick={() => setPush({ ...s.push })}>
                          Apply
                        </button>
                        <Link href={`/plan?scenario=${s.id}`} className="tinybtn">
                          Plan
                        </Link>
                        {canWrite ? (
                          <button type="button" className="tinybtn danger" disabled={pending} onClick={() => del(s.id)} aria-label={`Delete ${s.name}`}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="help">No scenarios saved. Set the sliders and save one to compare.</p>
          )}
        </div>
      </div>
    </>
  );
}
