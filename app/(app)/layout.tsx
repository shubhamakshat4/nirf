import Link from "next/link";
import { getPortalContext } from "@/lib/db/context";
import { navFor } from "@/lib/nav";
import { NavRail } from "@/components/NavRail";
import { Readout } from "@/components/Readout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/SignOutButton";
import { CATEGORIES, PKEYS } from "@/lib/engine";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalContext();
  const { actor, institution, cfg, readiness } = ctx;
  const w = CATEGORIES[cfg.category].w;
  const items = navFor(actor.role, { reviewQueue: readiness.submitted });
  const roleLabel = { CONTRIBUTOR: "Contributor", IQAC: "IQAC", LEADERSHIP: "Leadership" }[actor.role];

  return (
    <>
      <header className="top">
        <div className="topbar">
          <Link href="/" className="brand">
            NIRF Readiness <span>Portal</span>
          </Link>
          <div className="sub">
            {institution.name} · {CATEGORIES[cfg.category].nm} · {PKEYS.map((p) => `${p} ${Math.round(w[p] * 100)}`).join(" · ")}
          </div>
          <span className="whoami">
            <strong>{actor.name}</strong> · {roleLabel}
            {actor.role === "CONTRIBUTOR" && actor.ownedParams.length ? ` (${actor.ownedParams.join(", ")})` : ""}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <Readout ctx={ctx} />
      <div className="wrap">
        <div className="body">
          <NavRail items={items} />
          <main id="main">{children}</main>
        </div>
      </div>
      <footer className="foot">
        Built on the hierarchical weighted composite model (TLR, RP, GO, OI, PR → X1–X79). Scores are a readiness index, not an
        official NIRF score.
      </footer>
    </>
  );
}
