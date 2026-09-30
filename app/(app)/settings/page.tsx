import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/db/context";
import { can } from "@/lib/auth/can";
import { listUsers } from "@/lib/db/users";
import { SettingsForm } from "./SettingsForm";
import { UserManager } from "./UserManager";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getPortalContext();
  const { actor, institution } = ctx;
  if (!can(actor, { type: "settings:manage" })) redirect("/");
  const users = await listUsers(actor.institutionId);
  return (
    <>
      <div className="panel">
        <h2>What you are aiming at</h2>
        <p className="lede">
          Set the ranking category, the band you want to reach, and the year you want to reach it by. Everything downstream — gaps, roadmap,
          timelines — recalculates from these choices.
        </p>
        <SettingsForm institution={institution} />
      </div>
      <div className="panel">
        <h2>Users</h2>
        <p className="lede">
          Contributors see and edit only the parameters they own, and never see scores. IQAC verifies and runs the cycle. Leadership reads
          everything and runs scenarios.
        </p>
        <UserManager users={users} selfId={actor.id} />
      </div>
    </>
  );
}
