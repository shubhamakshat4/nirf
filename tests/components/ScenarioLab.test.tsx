// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SAMPLE, STEADY_PUSH, arrivalYear, defaultConfig, simulate } from "@/lib/engine";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
const saveScenario = vi.fn();
const removeScenario = vi.fn();
vi.mock("@/lib/actions/scenarios", () => ({
  saveScenario: (...a: unknown[]) => saveScenario(...a),
  removeScenario: (...a: unknown[]) => removeScenario(...a),
}));

import { ScenarioLab } from "@/app/(app)/scenarios/ScenarioLab";

const cfg = defaultConfig({ goal: "b50", baseYear: 2026, targetYear: 2031 });

describe("<ScenarioLab>", () => {
  beforeEach(() => {
    saveScenario.mockReset();
    removeScenario.mockReset();
    refresh.mockReset();
  });

  it("starts at steady push and shows the engine's arrival year and target-year score", () => {
    render(<ScenarioLab values={SAMPLE} cfg={cfg} scenarios={[]} canWrite />);
    // SAMPLE reaches Top 50 (55) in year 5 → 2031; score at year 5 = 55.926
    expect(screen.getByText("2031")).toBeInTheDocument();
    expect(screen.getByText("55.9")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Steady" })).toHaveAttribute("aria-pressed", "true");
  });

  it("recomputes in the browser when a slider moves", () => {
    render(<ScenarioLab values={SAMPLE} cfg={cfg} scenarios={[]} canWrite />);
    const rp = screen.getByLabelText("RP");
    fireEvent.change(rp, { target: { value: "2.2" } });
    const push = { ...STEADY_PUSH, RP: 2.2 };
    const expectedAt = simulate(SAMPLE, cfg, push, 5)[5].score;
    const expectedArrive = arrivalYear(SAMPLE, cfg, push);
    expect(screen.getByText(expectedAt.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }))).toBeInTheDocument();
    expect(screen.getByText(String(2026 + (expectedArrive ?? 0)))).toBeInTheDocument();
    expect(screen.getByText(/Aggressive \(2\.2×\)/)).toBeInTheDocument();
  });

  it("applies presets", () => {
    render(<ScenarioLab values={SAMPLE} cfg={cfg} scenarios={[]} canWrite />);
    fireEvent.click(screen.getByRole("button", { name: "Research-first" }));
    expect(screen.getByLabelText("RP")).toHaveValue("2.2");
    expect(screen.getByLabelText("OI")).toHaveValue("0.6");
    expect(screen.getByRole("button", { name: "Research-first" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hold steady" }));
    expect(screen.getByLabelText("TLR")).toHaveValue("0.4");
  });

  it("saves the current push under the typed name", async () => {
    saveScenario.mockResolvedValue({ ok: true, data: { name: "Push research" } });
    render(<ScenarioLab values={SAMPLE} cfg={cfg} scenarios={[]} canWrite />);
    fireEvent.click(screen.getByRole("button", { name: "Research-first" }));
    fireEvent.change(screen.getByLabelText("Scenario name"), { target: { value: "Push research" } });
    fireEvent.click(screen.getByRole("button", { name: "Save scenario" }));
    await waitFor(() => expect(saveScenario).toHaveBeenCalledWith({ name: "Push research", push: { TLR: 1, RP: 2.2, GO: 0.8, OI: 0.6, PR: 1.2 } }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved “Push research”"));
    expect(refresh).toHaveBeenCalled();
  });

  it("compares saved scenarios on arrival year and lets leadership apply one", () => {
    const scenarios = [
      { id: "s1", cycleId: "c1", name: "Everything", push: { TLR: 2.2, RP: 2.2, GO: 2.2, OI: 2.2, PR: 2.2 }, createdById: "u", createdByName: "VC", createdAt: "" },
      { id: "s2", cycleId: "c1", name: "Hold", push: { TLR: 0.4, RP: 0.4, GO: 0.4, OI: 0.4, PR: 0.4 }, createdById: "u", createdByName: "VC", createdAt: "" },
    ];
    render(<ScenarioLab values={SAMPLE} cfg={cfg} scenarios={scenarios} canWrite={false} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    const a1 = arrivalYear(SAMPLE, cfg, scenarios[0].push);
    const a2 = arrivalYear(SAMPLE, cfg, scenarios[1].push);
    expect(within(rows[0]).getByText(a1 === null ? "—" : String(2026 + a1))).toBeInTheDocument();
    expect(within(rows[1]).getByText(a2 === null ? "—" : String(2026 + a2))).toBeInTheDocument();
    // no save form and no delete for a viewer who cannot write
    expect(screen.queryByRole("button", { name: "Save scenario" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();
    fireEvent.click(within(rows[1]).getByRole("button", { name: "Apply" }));
    expect(screen.getByLabelText("GO")).toHaveValue("0.4");
  });
});
