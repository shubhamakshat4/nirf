// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { NavRail } from "@/components/NavRail";
import { navFor } from "@/lib/nav";

describe("role-aware navigation", () => {
  it("differs by role", () => {
    const c = navFor("CONTRIBUTOR").map((i) => i.href);
    const l = navFor("LEADERSHIP").map((i) => i.href);
    const q = navFor("IQAC", { reviewQueue: 3 }).map((i) => i.href);
    expect(c).toEqual(["/", "/data", "/method"]);
    expect(l).toEqual(["/", "/data", "/gaps", "/plan", "/scenarios", "/method"]);
    expect(q).toEqual(["/", "/data", "/data/review", "/gaps", "/plan", "/scenarios", "/cycles", "/settings", "/method"]);
    expect(navFor("IQAC", { reviewQueue: 3 }).find((i) => i.href === "/data/review")?.badge).toBe(3);
  });

  it("marks the current section and shows the review badge", () => {
    pathname = "/data/review";
    render(<NavRail items={navFor("IQAC", { reviewQueue: 2 })} />);
    const review = screen.getByRole("link", { name: /Review/ });
    expect(review).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /^Data/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("only the overview matches the root path", () => {
    pathname = "/";
    render(<NavRail items={navFor("LEADERSHIP")} />);
    expect(screen.getByRole("link", { name: /Overview/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Plan/ })).not.toHaveAttribute("aria-current");
  });
});
