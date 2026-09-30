"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt } from "@/lib/engine";

export type TrendPoint = { year: number; composite: number; status: string };

export function TrendChart({ data, threshold, goalName }: { data: TrendPoint[]; threshold: number; goalName: string }) {
  const years = data.map((d) => d.year);
  const domain: [number, number] = [Math.min(...years) - 0.5, Math.max(...years) + 0.5];
  return (
    <div className="chartbox" role="img" aria-label="Composite readiness across cycles">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: -12 }}>
          <CartesianGrid stroke="var(--line-2)" vertical={false} />
          <XAxis dataKey="year" type="number" domain={domain} ticks={years} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink)" }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(v) => [fmt(Number(v), 1), "composite"]}
            labelFormatter={(l) => {
              const d = data.find((x) => x.year === Number(l));
              return `${l}${d ? ` · ${d.status.toLowerCase().replace("_", " ")}` : ""}`;
            }}
          />
          <ReferenceLine y={threshold} stroke="var(--ochre)" strokeDasharray="5 4" label={{ value: `${goalName} ${threshold}`, position: "insideTopRight", fill: "var(--ochre)", fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="composite"
            stroke="var(--seal)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; payload?: TrendPoint; index?: number }) => (
              <circle
                key={p.index}
                cx={p.cx}
                cy={p.cy}
                r={5}
                fill={p.payload?.status === "LOCKED" ? "var(--seal)" : "var(--panel)"}
                stroke="var(--seal)"
                strokeWidth={2}
              />
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
