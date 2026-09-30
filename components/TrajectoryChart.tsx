"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt } from "@/lib/engine";

export type TrajectoryPoint = { year: number; plan: number; required: number };

export function TrajectoryChart({ data, threshold, targetYear }: { data: TrajectoryPoint[]; threshold: number; targetYear: number }) {
  return (
    <div className="chartbox" role="img" aria-label={`Projected readiness score by year; target ${threshold} in ${targetYear}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: -12 }}>
          <CartesianGrid stroke="var(--line-2)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink)" }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(v, name) => [fmt(Number(v), 1), name === "plan" ? "current push" : "required push"]}
          />
          <ReferenceLine y={threshold} stroke="var(--ochre)" strokeDasharray="5 4" label={{ value: `target ${threshold}`, position: "insideTopRight", fill: "var(--ochre)", fontSize: 11 }} />
          {data.some((d) => d.year === targetYear) ? (
            <ReferenceLine x={targetYear} stroke="var(--line)" strokeDasharray="3 3" label={{ value: String(targetYear), position: "top", fill: "var(--muted)", fontSize: 11 }} />
          ) : null}
          <Line type="monotone" dataKey="required" stroke="var(--ochre)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="plan" stroke="var(--seal)" strokeWidth={2} dot={{ r: 2.5, fill: "var(--seal)", strokeWidth: 0 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
