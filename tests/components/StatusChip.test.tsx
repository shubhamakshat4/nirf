// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusChip } from "@/components/StatusChip";
import { ReadinessBars } from "@/components/ReadinessBars";

describe("<StatusChip>", () => {
  it("labels every status", () => {
    render(
      <>
        <StatusChip status="EMPTY" />
        <StatusChip status="DRAFT" />
        <StatusChip status="SUBMITTED" />
        <StatusChip status="VERIFIED" />
        <StatusChip status="REJECTED" />
        <StatusChip status="IN_REVIEW" />
        <StatusChip status="LOCKED" />
      </>,
    );
    for (const l of ["no data", "draft", "submitted", "verified", "rejected", "in review", "locked"]) expect(screen.getByText(l)).toBeInTheDocument();
    expect(screen.getByText("verified")).toHaveClass("VERIFIED");
  });
});

describe("<ReadinessBars>", () => {
  it("shows verified counts per parameter and colours a complete bar seal", () => {
    const { container } = render(
      <ReadinessBars
        params={["TLR", "RP"]}
        byParam={{
          TLR: { total: 13, verified: 13, filled: 13, submitted: 0 },
          RP: { total: 21, verified: 10, filled: 12, submitted: 2 },
          GO: { total: 0, verified: 0, filled: 0, submitted: 0 },
          OI: { total: 0, verified: 0, filled: 0, submitted: 0 },
          PR: { total: 0, verified: 0, filled: 0, submitted: 0 },
        }}
      />,
    );
    expect(screen.getByText("13/13")).toBeInTheDocument();
    expect(screen.getByText("10/21 · 2 pending")).toBeInTheDocument();
    const fills = container.querySelectorAll(".fill");
    expect((fills[0] as HTMLElement).style.background).toBe("var(--seal)");
    expect((fills[1] as HTMLElement).style.background).toBe("var(--ochre)");
  });
});
