"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "@/lib/actions/settings";
import type { InstitutionRecord } from "@/lib/db/types";
import { BANDS, CATEGORIES, CATEGORY_KEYS, PEER_OPTIONS, PKEYS, type BandKey, type Bands, type CategoryKey } from "@/lib/engine";

export function SettingsForm({ institution }: { institution: InstitutionRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [name, setName] = useState(institution.name);
  const [category, setCategory] = useState<CategoryKey>(institution.category);
  const [targetBand, setTargetBand] = useState<BandKey>(institution.targetBand);
  const [baseYear, setBaseYear] = useState(String(institution.baseYear));
  const [targetYear, setTargetYear] = useState(String(institution.targetYear));
  const [peerBand, setPeerBand] = useState(String(institution.peerBand));
  const [sizeNorm, setSizeNorm] = useState(institution.sizeNorm ? "1" : "0");
  const [bands, setBands] = useState<Record<BandKey, string>>({
    b200: String(institution.bands.b200),
    b100: String(institution.bands.b100),
    b50: String(institution.bands.b50),
    b25: String(institution.bands.b25),
    b10: String(institution.bands.b10),
  });

  const w = CATEGORIES[category].w;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const b = {} as Bands;
    for (const k of Object.keys(bands) as BandKey[]) b[k] = Number(bands[k]);
    startTransition(async () => {
      const res = await updateSettings({
        name,
        category,
        targetBand,
        baseYear: Number(baseYear),
        targetYear: Number(targetYear),
        peerBand: Number(peerBand),
        sizeNorm: sizeNorm === "1",
        bands: b,
      });
      if (res.ok) {
        setMsg({ kind: "ok", text: "Settings saved — every page recalculates from these." });
        router.refresh();
      } else setMsg({ kind: "err", text: res.error });
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid2">
        <label className="field">
          <span className="lab">
            <span>Institution name</span>
          </span>
          <input type="text" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="lab">
            <span>Ranking category</span>
          </span>
          <select value={category} onChange={(e) => setCategory(e.target.value as CategoryKey)}>
            {CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {CATEGORIES[k].nm}
              </option>
            ))}
          </select>
          <span className="help">Weights: {PKEYS.map((p) => `${p} ${Math.round(w[p] * 100)}%`).join(" · ")}</span>
        </label>
        <label className="field">
          <span className="lab">
            <span>Target band</span>
          </span>
          <select value={targetBand} onChange={(e) => setTargetBand(e.target.value as BandKey)}>
            {BANDS.map((b) => (
              <option key={b.k} value={b.k}>
                {b.nm}
              </option>
            ))}
          </select>
          <span className="help">Composite score needed: {bands[targetBand]}</span>
        </label>
        <label className="field">
          <span className="lab">
            <span>Target year</span>
          </span>
          <input type="number" min={2021} max={2045} step={1} value={targetYear} onChange={(e) => setTargetYear(e.target.value)} />
          <span className="help">Submission cycle you want to hit.</span>
        </label>
        <label className="field">
          <span className="lab">
            <span>Base year</span>
          </span>
          <input type="number" min={2020} max={2040} step={1} value={baseYear} onChange={(e) => setBaseYear(e.target.value)} />
          <span className="help">Year the active cycle&apos;s data describes.</span>
        </label>
        <label className="field">
          <span className="lab">
            <span>Peer benchmark ceiling</span>
          </span>
          <select value={peerBand} onChange={(e) => setPeerBand(e.target.value)}>
            {PEER_OPTIONS.map((o) => (
              <option key={o.v} value={String(o.v)}>
                {o.nm}
              </option>
            ))}
          </select>
          <span className="help">What a score of 100 on each indicator means.</span>
        </label>
      </div>
      <hr className="rule" />
      <div className="row">
        <label className="field" style={{ flex: 1, minWidth: 240 }}>
          <span className="lab">
            <span>Size-normalise count indicators</span>
          </span>
          <select value={sizeNorm} onChange={(e) => setSizeNorm(e.target.value)}>
            <option value="1">On — compare counts per 1,000 students</option>
            <option value="0">Off — compare raw counts</option>
          </select>
          <span className="help">
            Keeps a 3,000-student university from being judged against a 20,000-student one on raw publication and faculty counts.
          </span>
        </label>
      </div>
      <div className="note">
        <strong>Band thresholds.</strong> These map this model&apos;s composite score onto NIRF rank bands. They are indicative — replace them with values
        calibrated against published scores in your category.
        <div className="row" style={{ marginTop: 10 }}>
          {BANDS.map((b) => (
            <label key={b.k} style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {b.nm}
              <br />
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={bands[b.k]}
                onChange={(e) => setBands({ ...bands, [b.k]: e.target.value })}
                style={{ width: 78, marginTop: 3 }}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="row">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        {msg ? (
          <span className={msg.kind === "ok" ? "formok" : "formerr"} role="status" style={{ marginTop: 0 }}>
            {msg.text}
          </span>
        ) : null}
      </div>
    </form>
  );
}
