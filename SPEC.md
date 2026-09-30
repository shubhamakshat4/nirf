# NIRF Readiness Portal — build specification

You are building a working portal from an existing single-file prototype.
`reference/nirf-readiness-console.html` in this folder is that prototype. It is
correct and calibrated. **Port its scoring engine verbatim — do not redesign the
model, reweight indicators, or invent new formulas.** Everything else (auth,
database, multi-user workflow, pages) is new.

Work through the phases in order. After each phase, run the checks listed for it
and report pass/fail before continuing. Do not skip to the UI before the engine
tests pass.

---

## 1. What this is for

Sri Sri University (and institutions like it) submit data to India's National
Institutional Ranking Framework once a year. The data lives in a dozen
departments — examinations, placements, finance, research cell, admissions,
IQAC — and nobody has a single view of how ready the institution is or how long
it would take to reach a target rank band.

The portal has three jobs:

1. **Collect** — each department owns a slice of the 79 indicators and enters
   its own numbers, with evidence attached.
2. **Diagnose** — IQAC sees the composite readiness score, parameter-wise gaps,
   and which moves buy the most score per unit of effort.
3. **Plan** — leadership sets a target band and year, and gets a year-by-year
   roadmap plus scenario comparison.

Year-on-year history matters: the same institution submits every cycle and needs
to see the trend, not just today's snapshot.

---

## 2. Stack

Keep it boring and local-first. No Docker, no cloud account needed to run.

- **Next.js 15**, App Router, TypeScript strict mode
- **Tailwind CSS v4**
- **Prisma** with **SQLite** for development (`file:./dev.db`). Put every query
  behind `lib/db/*.ts` so switching the Prisma provider to `postgresql` later is
  a connection-string change and nothing else.
- **Auth.js (NextAuth v5)** with the Credentials provider and bcrypt-hashed
  passwords. Seeded users only; no email flow.
- **Vitest** for unit tests, **@testing-library/react** for component tests
- **Recharts** for the trajectory chart. The band ruler is hand-written SVG —
  port it from the prototype, do not substitute a chart library.

Do not add a state-management library, a component kit, or a monorepo tool.

---

## 3. The engine — port this first, exactly

Extract from the prototype's `<script>` block into `lib/engine/`:

| File | Contents |
| --- | --- |
| `indicators.ts` | The `IND` array — all 79 entries with `id, p, w, nm, u, min, max, perK, inv, der, pace, lag, eff, act` |
| `derive.ts` | The `DERIVE` map and `withDerived()` |
| `score.ts` | `bounds()`, `norm()`, `paramScores()`, `composite()` |
| `simulate.ts` | `step()`, `simulate()`, `arrivalYear()`, `requiredFactor()`, `PACE_K` |
| `priority.ts` | `priorities()` |
| `constants.ts` | `CATEGORIES`, `BANDS`, `ACCRED`, `PARAM_NAMES`, `PKEYS`, `SAMPLE_RAW` |

Type everything properly: `type IndicatorId = "X1" | ... | "X79"`, `type Param =
"TLR" | "RP" | "GO" | "OI" | "PR"`, `type Values = Partial<Record<IndicatorId,
number>>`.

**Remove the global `S` object.** Every engine function must be pure and take its
configuration as an argument:

```ts
type EngineConfig = {
  category: CategoryKey;
  goal: BandKey;
  bands: Record<BandKey, number>;
  peer: number;        // 1 | 0.8 | 0.62
  sizeNorm: boolean;
  baseYear: number;
  targetYear: number;
};
composite(values: Values, cfg: EngineConfig): number
simulate(values: Values, cfg: EngineConfig, push: Push, years?: number): PathPoint[]
```

### Facts the port must preserve

- Fifteen indicators are derived, never entered: X5, X10, X21, X39, X42, X46,
  X49, X53, X55, X57, X67, X70, X73, X74, X77. Only 64 are enterable.
- `norm()` returns 0 for a falsy raw value, including inverted indicators. A
  missing students-per-faculty figure must not score 100.
- `perK` bounds scale by `max(0.5, students/1000)` when `sizeNorm` is on.
- Movement is normalised points per year: `min(pace * PACE_K * push, (100-n) *
  0.35)`, then converted back to raw units. `PACE_K = 0.7`.
- An indicator with `lag: L` does not move until year `L + 1`.
- `requiredFactor()` binary-searches a scalar on all five push values and returns
  `Infinity` when the target year is unreachable at 6×.

### Engine tests — these must pass before anything else

Category `overall`, default bands (30/42/55/68/80), peer 1, sizeNorm on,
baseYear 2026, push 1.0 across all five parameters. Tolerance ±0.01.

| Fixture | composite | TLR | RP | GO | OI | PR |
| --- | --- | --- | --- | --- | --- | --- |
| `SAMPLE` (prototype's sample, derived keys stripped) | 46.7236 | 49.3478 | 38.5432 | 51.7160 | 45.6657 | 54.4650 |
| `WEAK` (see below) | 16.0016 | 17.9774 | 3.5818 | 25.3760 | 30.7395 | 13.8471 |
| `{ X1: 3000 }` | 0.2143 | 0.7143 | 0 | 0 | 0 | 0 |

Arrival years at steady push (`arrivalYear` returns years from base):

| Fixture | Ranked (30) | Top 100 (42) | Top 50 (55) | score at year 5 |
| --- | --- | --- | --- | --- |
| `SAMPLE` | 0 | 0 | 5 | 55.9260 |
| `WEAK` | 7 | 12 | 19 | 26.4852 |
| `{ X1: 3000 }` | 12 | 17 | null | 12.8520 |

`WEAK` fixture:

```ts
export const WEAK = {
  X1:3000,X2:120,X3:80,X4:45,X6:20,X7:18,X8:22,X9:4,X11:0.8,X12:25,X13:12,X14:900,X15:40,
  X16:40,X17:25,X18:10,X19:6,X20:150,X22:12,X23:2,X24:0,X25:1,X26:3,X27:0.6,X28:1,X29:0.1,
  X30:20,X31:3,X32:1,X33:4,X34:0.5,X35:1,X36:0,X37:4,
  X38:600,X40:82,X41:88,X43:48,X44:3.2,X45:3.8,X47:10,X48:5,X50:30,X51:60,X52:1,
  X54:40,X56:33,X58:6.7,X59:2,X60:0,X61:400,X62:700,X63:8,X64:0.6,X65:60,X66:4,
  X68:20,X69:25,X71:1,X72:1,X75:2,X76:2,X78:5,X79:12
};
```

Also assert: derived values recompute correctly (X5 = X1/X2, X70 = mean of
X68/X69, X42 = X38 × X43 / 100); every parameter's sub-weights sum to 100;
turning `sizeNorm` off changes the composite; `requiredFactor` returns `Infinity`
for goal `b10` with the `WEAK` fixture and a 3-year horizon.

If any number above disagrees with your port, the port is wrong — fix the port,
never the expected value.

---

## 4. Data model

```prisma
model Institution { id, name, category, baseYear, targetYear, targetBand,
                    peerBand, sizeNorm, bands Json, createdAt }
model User        { id, email, name, passwordHash, role, institutionId,
                    ownedParams String  // csv of TLR,RP,GO,OI,PR
                  }
model Cycle       { id, institutionId, year, status, lockedAt
                    // status: DRAFT | IN_REVIEW | LOCKED
                  }
model Entry       { id, cycleId, indicatorId, value Float?, note String?,
                    evidenceUrl String?, status, updatedById, updatedAt
                    // status: EMPTY | DRAFT | SUBMITTED | VERIFIED | REJECTED
                    @@unique([cycleId, indicatorId])
                  }
model EntryLog    { id, entryId, oldValue, newValue, userId, at }
model Scenario    { id, cycleId, name, push Json, createdById, createdAt }
```

Only enterable indicators get `Entry` rows. Derived values are computed at read
time, never stored.

**Roles**

- `CONTRIBUTOR` — reads and writes `Entry` rows only for indicators inside its
  `ownedParams`, only while the cycle is `DRAFT`. Sees no scores.
- `IQAC` — reads everything, verifies or rejects entries, edits any value, moves
  the cycle through statuses, edits band thresholds.
- `LEADERSHIP` — reads everything, runs scenarios, cannot edit entries.

Enforce this in a server-side `can()` helper called by every route handler and
server action. Do not rely on hiding UI.

---

## 5. Pages

Port the prototype's visual language exactly: paper `#EEF1EF`, ink `#14201C`,
seal green `#0F6B52`, ochre `#B4762A`, clay `#A33529`; Bricolage Grotesque for
headings and readouts, IBM Plex Sans with tabular numerals for data. Keep the
dark-mode token blocks. Keep the sticky readout strip with the band ruler on
every signed-in page.

| Route | Who | Contents |
| --- | --- | --- |
| `/login` | all | Credentials form |
| `/` | all | Readout strip, composite, arrival year, data-readiness bar, what this role should do next |
| `/data` | contributor, IQAC | The 79 indicators grouped by parameter. Contributors see only their own parameters. Each row: value, unit, weight, live 0–100 meter, note, evidence link, status chip, last-edited-by. Derived rows are read-only and show their formula |
| `/data/review` | IQAC | Queue of `SUBMITTED` entries with verify/reject and a diff against last cycle |
| `/gaps` | IQAC, leadership | Parameter bars with target markers, priority-index table, top-16 leverage table |
| `/plan` | IQAC, leadership | Trajectory chart, feasibility verdict, year-by-year roadmap, copy-as-text |
| `/scenarios` | IQAC, leadership | Five push sliders, presets, saved scenarios compared on arrival year |
| `/cycles` | IQAC | Cycle list, create next year's cycle pre-filled from the last, lock a cycle, trend chart of composite across locked cycles |
| `/settings` | IQAC | Category, target band, target year, peer band, size normalisation, editable band thresholds, user management |

Server components for data fetching, client components only where interactivity
demands it. Scores are computed on the server and passed down; the scenario
sliders recompute in the browser using the same engine module.

---

## 6. Seed data

`prisma/seed.ts` creates:

- One institution, "Sri Sri University", category `overall`, base year 2026,
  target Top 100 by 2031.
- Cycle 2026 in `DRAFT`, populated from `SAMPLE_RAW` minus derived keys, every
  entry `VERIFIED`.
- Cycle 2025, `LOCKED`, with each value at 88% of the 2026 figure, so the trend
  chart has two points.
- Users, all password `nirf1234`:
  `iqac@ssu.edu` (IQAC), `vc@ssu.edu` (LEADERSHIP),
  `research@ssu.edu` (CONTRIBUTOR, owns RP), `placement@ssu.edu` (CONTRIBUTOR,
  owns GO), `admissions@ssu.edu` (CONTRIBUTOR, owns OI),
  `registrar@ssu.edu` (CONTRIBUTOR, owns TLR).

Print the credentials table at the end of the seed run.

---

## 7. Phases and checkpoints

**Phase 1 — engine.** Scaffold the project, port the engine, write the Vitest
suite from section 3. Checkpoint: `npm test` green, every fixture matching.
Report the actual computed numbers next to the expected ones.

**Phase 2 — data layer.** Prisma schema, migration, seed, `lib/db` query
functions, `can()` authorisation helper with its own unit tests. Checkpoint:
`npx prisma migrate dev` and `npm run seed` both succeed; a test asserts a
CONTRIBUTOR owning RP is denied a write to an OI indicator.

**Phase 3 — auth and shell.** Login, session, role-aware nav, the readout strip
with the band ruler. Checkpoint: `npm run dev`, sign in as each of the three
roles, confirm the nav differs.

**Phase 4 — data entry and review.** `/data`, `/data/review`, entry logging.
Checkpoint: edit a value as `research@ssu.edu`, verify it as `iqac@ssu.edu`, see
the composite move on `/`.

**Phase 5 — diagnosis and planning.** `/gaps`, `/plan`, `/scenarios`, `/cycles`.
Checkpoint: with seeded data and target Top 100 by 2031, `/plan` shows a
feasibility verdict and a roadmap whose year-one movers are non-empty.

**Phase 6 — finish.** README with setup steps and the credentials table,
`npm run check` script chaining `tsc --noEmit`, `eslint`, `vitest run`.
Checkpoint: `npm run check` clean, `npm run dev` serving on
`http://localhost:3000`.

---

## 8. Quality floor

- TypeScript strict, no `any`, no `@ts-ignore`.
- Every route handler and server action validates input with Zod and checks
  `can()` before touching the database.
- Responsive to 375px. Visible keyboard focus. `prefers-reduced-motion`
  respected. Labels on every input.
- Numbers formatted `en-IN` with tabular figures.
- No secrets in the repo; `.env.example` committed, `.env` git-ignored.

## 9. Things to leave alone

- Do not change any indicator weight, floor, ceiling, pace or lag.
- Do not present the composite as an official NIRF score. Carry the prototype's
  Method page into the portal verbatim, including the caveats that the band
  thresholds are indicative, the sub-weights are rationale-based rather than
  empirically fitted, and X71–X79 are researcher-defined predictors rather than
  official NIRF perception inputs.
- Do not add AI features, chat, or PDF generation in this build.
