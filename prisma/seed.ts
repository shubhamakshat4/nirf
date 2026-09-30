import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_BANDS, ENTERABLE_IDS, SAMPLE, type IndicatorId } from "../lib/engine";

const prisma = new PrismaClient();

const PASSWORD = "nirf1234";

const USERS: { email: string; name: string; role: string; ownedParams: string }[] = [
  { email: "iqac@ssu.edu", name: "IQAC Coordinator", role: "IQAC", ownedParams: "" },
  { email: "vc@ssu.edu", name: "Vice-Chancellor", role: "LEADERSHIP", ownedParams: "" },
  { email: "research@ssu.edu", name: "Research Cell", role: "CONTRIBUTOR", ownedParams: "RP" },
  { email: "placement@ssu.edu", name: "Placement Office", role: "CONTRIBUTOR", ownedParams: "GO" },
  { email: "admissions@ssu.edu", name: "Admissions Office", role: "CONTRIBUTOR", ownedParams: "OI" },
  { email: "registrar@ssu.edu", name: "Registrar", role: "CONTRIBUTOR", ownedParams: "TLR" },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main() {
  // Start clean so the seed is idempotent.
  await prisma.entryLog.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();

  const inst = await prisma.institution.create({
    data: {
      name: "Sri Sri University",
      category: "overall",
      baseYear: 2026,
      targetYear: 2031,
      targetBand: "b100",
      peerBand: 1,
      sizeNorm: true,
      bands: DEFAULT_BANDS,
    },
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users: Record<string, { id: string }> = {};
  for (const u of USERS) {
    users[u.email] = await prisma.user.create({
      data: { ...u, passwordHash, institutionId: inst.id },
    });
  }
  const iqacId = users["iqac@ssu.edu"].id;

  // Cycle 2026 — DRAFT, every enterable indicator VERIFIED from the sample.
  const c2026 = await prisma.cycle.create({
    data: {
      institutionId: inst.id,
      year: 2026,
      status: "DRAFT",
      entries: {
        create: ENTERABLE_IDS.map((id: IndicatorId) => ({
          indicatorId: id,
          value: SAMPLE[id] ?? null,
          status: SAMPLE[id] !== undefined ? "VERIFIED" : "EMPTY",
          updatedById: iqacId,
          note: "Seeded from the calibrated sample university",
        })),
      },
    },
  });

  // Cycle 2025 — LOCKED, each value at 88% of the 2026 figure.
  const c2025 = await prisma.cycle.create({
    data: {
      institutionId: inst.id,
      year: 2025,
      status: "LOCKED",
      lockedAt: new Date("2025-09-30T00:00:00Z"),
      entries: {
        create: ENTERABLE_IDS.map((id: IndicatorId) => {
          const v = SAMPLE[id];
          return {
            indicatorId: id,
            value: v !== undefined ? round2(v * 0.88) : null,
            status: v !== undefined ? "VERIFIED" : "EMPTY",
            updatedById: iqacId,
            note: "Locked 2025 submission",
          };
        }),
      },
    },
  });

  // One saved scenario so the comparison table is not empty on first sign-in.
  await prisma.scenario.create({
    data: {
      cycleId: c2026.id,
      name: "Steady push",
      push: { TLR: 1, RP: 1, GO: 1, OI: 1, PR: 1 },
      createdById: users["vc@ssu.edu"].id,
    },
  });

  const entries2026 = await prisma.entry.count({ where: { cycleId: c2026.id } });
  const entries2025 = await prisma.entry.count({ where: { cycleId: c2025.id } });

  console.log(`\nSeeded "${inst.name}" (${inst.category}) — base ${inst.baseYear}, target ${inst.targetBand} by ${inst.targetYear}`);
  console.log(`  Cycle 2026 DRAFT  — ${entries2026} entries, all VERIFIED`);
  console.log(`  Cycle 2025 LOCKED — ${entries2025} entries at 88% of 2026`);
  console.log("\nCredentials (password for every account: nirf1234)\n");
  console.table(
    USERS.map((u) => ({
      email: u.email,
      role: u.role,
      owns: u.ownedParams || "—",
      password: PASSWORD,
    })),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
