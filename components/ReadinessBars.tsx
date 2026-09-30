import type { Readiness } from "@/lib/db/context";
import type { Param } from "@/lib/engine";

export function ReadinessBars({ byParam, params }: { byParam: Readiness["byParam"]; params: readonly Param[] }) {
  return (
    <div>
      {params.map((p) => {
        const b = byParam[p] ?? { total: 0, verified: 0, filled: 0, submitted: 0 };
        const full = b.total > 0 && b.verified === b.total;
        return (
          <div className="pbar" key={p}>
            <div className="nm">{p}</div>
            <div className="track" aria-label={`${p}: ${b.verified} of ${b.total} verified`}>
              <div
                className="fill"
                style={{ width: `${b.total ? (100 * b.verified) / b.total : 0}%`, background: full ? "var(--seal)" : "var(--ochre)" }}
              />
            </div>
            <div className="val">
              {b.verified}/{b.total}
              {b.submitted ? ` · ${b.submitted} pending` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
