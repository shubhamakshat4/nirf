// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BandRuler } from "@/components/BandRuler";
import { DEFAULT_BANDS } from "@/lib/engine";

describe("<BandRuler>", () => {
  it("draws the six band segments, the target line and the score markers", () => {
    const { container } = render(<BandRuler now={46.7} proj={55.9} bands={DEFAULT_BANDS} goal="b100" targetYear={2031} />);
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute("aria-label", expect.stringContaining("46.7"));
    expect(container.querySelectorAll("rect").length).toBeGreaterThanOrEqual(6);
    expect(screen.getByText("target top 100")).toBeInTheDocument();
    expect(screen.getByText("55.9 in 2031")).toBeInTheDocument();
    // threshold labels for every band below 100
    for (const t of [30, 42, 55, 68, 80]) expect(screen.getByText(String(t))).toBeInTheDocument();
    // the ink "now" triangle
    expect(container.querySelector('path[fill="var(--ink)"]')).not.toBeNull();
  });

  it("omits score markers when no score is supplied (contributor view)", () => {
    const { container } = render(<BandRuler bands={DEFAULT_BANDS} goal="b50" targetYear={2031} />);
    expect(container.querySelector('path[fill="var(--ink)"]')).toBeNull();
    expect(container.querySelector("circle")).toBeNull();
    expect(screen.getByText("target top 50")).toBeInTheDocument();
  });

  it("does not draw a projection that is not ahead of today", () => {
    const { container } = render(<BandRuler now={60} proj={60.1} bands={DEFAULT_BANDS} goal="b100" targetYear={2031} />);
    expect(container.querySelector("circle")).toBeNull();
  });

  it("uses the edited band thresholds, not the defaults", () => {
    render(<BandRuler now={10} bands={{ b200: 25, b100: 40, b50: 52, b25: 66, b10: 78 }} goal="b100" targetYear={2031} />);
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.queryByText("30")).toBeNull();
  });
});
