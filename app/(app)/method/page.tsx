import type { Metadata } from "next";
import { IND, PACE_K, fmt } from "@/lib/engine";

export const metadata: Metadata = { title: "Method" };

/** The prototype's Method page, carried over verbatim. */
export default function MethodPage() {
  return (
    <div className="panel">
      <h2>How this computes</h2>
      <p className="lede">Three levels, exactly as set out in the source model.</p>
      <p style={{ maxWidth: "68ch", fontSize: 14 }}>
        Raw indicators are min–max normalised to 0–100 against a peer band, weighted into five parameter scores, and combined into a composite using
        the official category weights. The timeline layer is an addition to the paper: each indicator carries a plausible annual gap-closure rate and
        a lag, and the model runs that forward year by year until the composite clears your target band.
      </p>
      <hr className="rule" />
      <h3 style={{ fontSize: 15, marginBottom: 8 }}>What is modelled honestly</h3>
      <ul style={{ fontSize: 13.5, color: "var(--ink-2)", maxWidth: "68ch", paddingLeft: 18 }}>
        <li>
          Lags are real. Citations, h-index, granted patents and perception scores do not respond in the year you act — they are held for two to three
          years before movement registers.
        </li>
        <li>Fast indicators are fast. Internships, certifications, MoUs, accessibility compliance and recruiter engagement can move substantially within a year.</li>
        <li>
          Slow indicators are slow. Permanent faculty share, experienced faculty, graduation rate and peer perception move a fraction of their gap per year
          no matter how hard you push.
        </li>
        <li>Nothing exceeds the peer ceiling. The model will not let you plan your way past the best performance in your band.</li>
      </ul>
      <hr className="rule" />
      <h3 style={{ fontSize: 15, marginBottom: 8 }}>What is an assumption</h3>
      <ul style={{ fontSize: 13.5, color: "var(--ink-2)", maxWidth: "68ch", paddingLeft: 18 }}>
        <li>
          The composite here is a readiness index on a 0–100 scale of this model&apos;s own construction. It is not the published NIRF score and will not
          equal it. Calibrate the band thresholds against published scores for your category before treating an arrival year as a commitment.
        </li>
        <li>
          Sub-parameter weights are the paper&apos;s proposed weights, which are rationale-based rather than empirically fitted. The official NIRF
          methodology differs by category and year.
        </li>
        <li>Perception indicators X71–X79 are the paper&apos;s own predictor variables, not official NIRF perception inputs.</li>
        <li>
          Benchmark floors and ceilings are seeded for a mid-size Indian multidisciplinary university. Replace them with your actual peer cohort&apos;s
          values for a defensible forecast.
        </li>
      </ul>
      <hr className="rule" />
      <h3 style={{ fontSize: 15, marginBottom: 8 }}>Indicator engine settings</h3>
      <p className="help">Floors, ceilings, annual gap-closure rates and lags. These are fixed in the engine and are not editable from the portal.</p>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Indicator</th>
              <th className="n">Weight</th>
              <th className="n">Floor</th>
              <th className="n">Ceiling</th>
              <th className="n">Annual movement</th>
              <th className="n">Lag</th>
            </tr>
          </thead>
          <tbody>
            {IND.map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>
                  {i.nm}
                  {i.perK ? <span className="muted"> per 1k students</span> : null}
                </td>
                <td className="n">{i.w}%</td>
                <td className="n">{i.min}</td>
                <td className="n">{i.max}</td>
                <td className="n">{i.der ? "derived" : `${fmt(i.pace * PACE_K, 1)} pts`}</td>
                <td className="n">{i.lag} yr</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
