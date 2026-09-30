// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { EntryRecord } from "@/lib/db/types";
import { IND, SAMPLE, type IndicatorId } from "@/lib/engine";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const saveEntries = vi.fn();
const submitParam = vi.fn();
vi.mock("@/lib/actions/entries", () => ({
  saveEntries: (...a: unknown[]) => saveEntries(...a),
  submitParam: (...a: unknown[]) => submitParam(...a),
}));

import { DataForm } from "@/app/(app)/data/DataForm";

function entry(id: IndicatorId, value: number | null, status: EntryRecord["status"] = "VERIFIED"): EntryRecord {
  return {
    id: `e-${id}`,
    cycleId: "c1",
    indicatorId: id,
    value,
    note: null,
    evidenceUrl: null,
    status,
    updatedById: "u1",
    updatedByName: "Research Cell",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

const rpIds = IND.filter((i) => i.p === "RP").map((i) => i.id);
const entries = rpIds.filter((id) => !IND.find((i) => i.id === id)?.der).map((id) => entry(id, SAMPLE[id] ?? null, "DRAFT"));
const editable = Object.fromEntries(rpIds.map((id) => [id, true]));

function renderRP() {
  return render(
    <DataForm
      cycleId="c1"
      cycleStatus="DRAFT"
      role="CONTRIBUTOR"
      params={["RP"]}
      entries={entries}
      baseValues={{ X1: 6850, X16: 1240, X20: 9650, X17: 980 }}
      cfg={{ peer: 1, sizeNorm: true, category: "overall" }}
      editable={editable}
      submittable={["RP"]}
      showScores={false}
    />,
  );
}

describe("<DataForm> as a contributor owning RP", () => {
  beforeEach(() => {
    saveEntries.mockReset();
    submitParam.mockReset();
    refresh.mockReset();
  });

  it("renders only RP rows, with derived rows read-only and showing their formula", () => {
    renderRP();
    expect(screen.getByRole("heading", { name: /RP — Research & Professional Practice/ })).toBeInTheDocument();
    expect(screen.queryByText(/Teaching, Learning/)).toBeNull();
    // X21 is derived: no input, formula shown, computed value 9650/1240 = 7.78
    expect(screen.getByText(/computed from X20 ÷ X16/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Citations per publication")).toBeNull();
    expect(screen.getByLabelText("Citations per publication computed value")).toHaveTextContent("7.78");
    // every enterable RP row has a labelled input
    expect(screen.getByLabelText("Total research publications")).toHaveValue(1240);
    expect(screen.getByLabelText("Scopus-indexed publications")).toHaveValue(980);
    expect(screen.getAllByText("draft").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/last edited by Research Cell/).length).toBeGreaterThan(0);
  });

  it("does not show parameter scores to a contributor", () => {
    renderRP();
    expect(screen.queryByText(/score .* \/ 100/)).toBeNull();
    expect(screen.getByText(/enterable · .* derived/)).toBeInTheDocument();
  });

  it("moves the live meter and the derived figure as a value is typed, and enables Save", () => {
    renderRP();
    const save = screen.getByRole("button", { name: /Saved/ });
    expect(save).toBeDisabled();
    const input = screen.getByLabelText("Total research publications");
    // 1240 papers with 6850 students: k=6.85, bounds 34.25..2055 → norm ≈ 59.7
    const row = input.closest(".ind")!;
    expect(row.querySelector(".pct")!.textContent).toBe("60/100");
    fireEvent.change(input, { target: { value: "2055" } });
    expect(row.querySelector(".pct")!.textContent).toBe("100/100");
    expect(row.classList.contains("dirty")).toBe(true);
    // X21 = X20 / X16 follows the edit: 9650 / 2055 = 4.70
    expect(screen.getByLabelText("Citations per publication computed value")).toHaveTextContent("4.70");
    expect(screen.getByRole("button", { name: /Save 1 change/ })).toBeEnabled();
  });

  it("shows 'no data' when a value is cleared", () => {
    renderRP();
    const input = screen.getByLabelText("Total research publications");
    fireEvent.change(input, { target: { value: "" } });
    expect(input.closest(".ind")!.querySelector(".pct")!.textContent).toBe("no data");
  });

  it("saves only the dirty rows of that parameter and refreshes", async () => {
    saveEntries.mockResolvedValue({ ok: true, data: [entry("X16", 2055, "DRAFT")] });
    renderRP();
    fireEvent.change(screen.getByLabelText("Total research publications"), { target: { value: "2055" } });
    fireEvent.click(screen.getByRole("button", { name: /Save 1 change/ }));
    await waitFor(() => expect(saveEntries).toHaveBeenCalledTimes(1));
    const arg = saveEntries.mock.calls[0][0] as { cycleId: string; items: { indicatorId: string; value: number | null }[] };
    expect(arg.cycleId).toBe("c1");
    expect(arg.items).toHaveLength(1);
    expect(arg.items[0]).toMatchObject({ indicatorId: "X16", value: 2055 });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved 1 entry"));
    expect(refresh).toHaveBeenCalled();
  });

  it("surfaces a server-side refusal", async () => {
    saveEntries.mockResolvedValue({ ok: false, error: "You cannot edit X16 (RP) in a LOCKED cycle" });
    renderRP();
    fireEvent.change(screen.getByLabelText("Total research publications"), { target: { value: "2055" } });
    fireEvent.click(screen.getByRole("button", { name: /Save 1 change/ }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/cannot edit X16/));
  });

  it("refuses to submit while there are unsaved changes, then submits the parameter", async () => {
    submitParam.mockResolvedValue({ ok: true, data: { count: 21 } });
    renderRP();
    fireEvent.change(screen.getByLabelText("Total research publications"), { target: { value: "2055" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit .*to IQAC/ }));
    expect(submitParam).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/Save your changes/);
    // revert the edit → not dirty any more
    fireEvent.change(screen.getByLabelText("Total research publications"), { target: { value: "1240" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit .*to IQAC/ }));
    await waitFor(() => expect(submitParam).toHaveBeenCalledWith({ cycleId: "c1", param: "RP" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Submitted 21 entries"));
  });
});

describe("<DataForm> as IQAC", () => {
  it("shows parameter scores and every parameter", { timeout: 30000 }, () => {
    const all = IND.filter((i) => !i.der).map((i) => entry(i.id, SAMPLE[i.id] ?? null));
    render(
      <DataForm
        cycleId="c1"
        cycleStatus="DRAFT"
        role="IQAC"
        params={["TLR", "RP", "GO", "OI", "PR"]}
        entries={all}
        baseValues={SAMPLE}
        cfg={{ peer: 1, sizeNorm: true, category: "overall" }}
        editable={Object.fromEntries(IND.map((i) => [i.id, !i.der]))}
        submittable={[]}
        showScores
      />,
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
    expect(screen.getByText(/score 49\.3 \/ 100/)).toBeInTheDocument(); // TLR from the calibrated fixture
    expect(screen.getByText(/score 38\.5 \/ 100/)).toBeInTheDocument(); // RP
    expect(screen.getByLabelText("Accreditation and quality grade")).toHaveValue("95"); // NAAC A++ select
  });

  it("renders read-only when nothing is editable (locked cycle or leadership)", () => {
    const all = IND.filter((i) => i.p === "PR" && !i.der).map((i) => entry(i.id, SAMPLE[i.id] ?? null));
    render(
      <DataForm
        cycleId="c1"
        cycleStatus="LOCKED"
        role="LEADERSHIP"
        params={["PR"]}
        entries={all}
        baseValues={SAMPLE}
        cfg={{ peer: 1, sizeNorm: true, category: "overall" }}
        editable={{}}
        submittable={[]}
        showScores
      />,
    );
    expect(screen.getByLabelText("Academic peer perception score")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Save/ })).toBeNull();
  });
});
