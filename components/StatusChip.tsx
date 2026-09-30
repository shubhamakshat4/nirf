import type { CycleStatus, EntryStatus } from "@/lib/db/types";

const LABEL: Record<EntryStatus | CycleStatus, string> = {
  EMPTY: "no data",
  DRAFT: "draft",
  SUBMITTED: "submitted",
  VERIFIED: "verified",
  REJECTED: "rejected",
  IN_REVIEW: "in review",
  LOCKED: "locked",
};

export function StatusChip({ status }: { status: EntryStatus | CycleStatus }) {
  return <span className={`chipstat ${status}`}>{LABEL[status]}</span>;
}
