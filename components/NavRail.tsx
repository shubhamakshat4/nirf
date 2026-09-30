"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; hint: string; badge?: number };

export function NavRail({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // Longest matching href wins, so /data/review lights "Review" and not "Data".
  const matches = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const current = items.filter((it) => matches(it.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="rail" aria-label="Sections">
      {items.map((it) => {
        const active = it.href === current;
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}>
            <strong>
              {it.label}
              {it.badge ? <span className="badge">{it.badge}</span> : null}
            </strong>
            <small>{it.hint}</small>
          </Link>
        );
      })}
    </nav>
  );
}
