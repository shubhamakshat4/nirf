import type { Role } from "@/lib/db/types";
import type { NavItem } from "@/components/NavRail";

/** Role-aware navigation. Mirrors can(); the server still enforces every route. */
export function navFor(role: Role, opts: { reviewQueue?: number } = {}): NavItem[] {
  const home: NavItem = { href: "/", label: "Overview", hint: "Where you stand" };
  const data: NavItem = { href: "/data", label: "Data", hint: "79 indicators" };
  const method: NavItem = { href: "/method", label: "Method", hint: "How this computes" };
  if (role === "CONTRIBUTOR") return [home, data, method];
  const gaps: NavItem = { href: "/gaps", label: "Gaps", hint: "What to fix first" };
  const plan: NavItem = { href: "/plan", label: "Plan", hint: "Year-by-year roadmap" };
  const scenarios: NavItem = { href: "/scenarios", label: "Scenarios", hint: "Tweak and compare" };
  if (role === "LEADERSHIP") return [home, data, gaps, plan, scenarios, method];
  const review: NavItem = { href: "/data/review", label: "Review", hint: "Verify submissions", badge: opts.reviewQueue };
  const cycles: NavItem = { href: "/cycles", label: "Cycles", hint: "Years and trend" };
  const settings: NavItem = { href: "/settings", label: "Settings", hint: "Goal, bands, users" };
  return [home, data, review, gaps, plan, scenarios, cycles, settings, method];
}
