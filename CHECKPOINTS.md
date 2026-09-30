# Build record — phase checkpoints

Built 2026-09-20 against `SPEC.md`. Every phase's check was run and the actual
output recorded here; nothing was skipped.

## Phase 1 — engine

`npx vitest run tests/engine.test.ts` → **28/28 pass**.

Computed vs expected (category `overall`, bands 30/42/55/68/80, peer 1,
sizeNorm on, base 2026, push 1.0, tolerance ±0.01):

| Fixture | Metric | Expected | Actual |
| --- | --- | --- | --- |
| SAMPLE | composite | 46.7236 | 46.7236 |
| SAMPLE | TLR | 49.3478 | 49.3478 |
| SAMPLE | RP | 38.5432 | 38.5432 |
| SAMPLE | GO | 51.716 | 51.7160 |
| SAMPLE | OI | 45.6657 | 45.6657 |
| SAMPLE | PR | 54.465 | 54.4650 |
| WEAK | composite | 16.0016 | 16.0016 |
| WEAK | TLR | 17.9774 | 17.9774 |
| WEAK | RP | 3.5818 | 3.5818 |
| WEAK | GO | 25.376 | 25.3760 |
| WEAK | OI | 30.7395 | 30.7395 |
| WEAK | PR | 13.8471 | 13.8471 |
| {X1:3000} | composite | 0.2143 | 0.2143 |
| {X1:3000} | TLR | 0.7143 | 0.7143 |
| {X1:3000} | RP/GO/OI/PR | 0 | 0.0000 |
| SAMPLE | arrival Ranked / Top 100 / Top 50 | 0 / 0 / 5 | 0 / 0 / 5 |
| SAMPLE | score at year 5 | 55.926 | 55.9260 |
| WEAK | arrival Ranked / Top 100 / Top 50 | 7 / 12 / 19 | 7 / 12 / 19 |
| WEAK | score at year 5 | 26.4852 | 26.4852 |
| {X1:3000} | arrival Ranked / Top 100 / Top 50 | 12 / 17 / null | 12 / 17 / null |
| {X1:3000} | score at year 5 | 12.852 | 12.8520 |
| WEAK | requiredFactor b10, 3-year horizon | Infinity | Infinity |

Also asserted: derived values recompute (X5 = X1/X2, X70 = mean(X68, X69),
X42 = X38×X43/100, and the other twelve); every parameter's sub-weights sum to
100; every category's weights sum to 1; sizeNorm off changes the composite;
`norm()` returns 0 for a falsy raw value including inverted X5; perK bounds
scale by max(0.5, students/1000); lagged indicators do not move until year
lag+1; movement is capped at 35% of the remaining normalised gap; push 0 holds
every value; the engine does not mutate its inputs.

**Finding during the port.** The first run matched every parameter except GO
(SAMPLE 51.9078 vs 51.716; WEAK 25.6184 vs 25.376). Running the prototype's own
script in Node gave the same 51.9078, so the port was faithful to the file and
the file disagreed with the spec. The single change that reproduces every spec
figure to four decimals is X49's floor being 1 rather than the file's 0.2 (X49
is a derived duplicate of X31, whose row has 0.2). Per §3 — "fix the port, never
the expected value" — the engine carries `min: 1` on X49, commented at the row
and documented in the README.

## Phase 2 — data layer

- `npx prisma migrate dev --name init` → migration `20260920120106_init` applied,
  client generated.
- `npm run seed` → "Sri Sri University" (overall, base 2026, Top 100 by 2031);
  cycle 2026 DRAFT with 64 entries all VERIFIED; cycle 2025 LOCKED with 64
  entries at 88%; six users; credentials table printed.
- `npx vitest run tests/can.test.ts` → **10/10 pass**, including
  "a CONTRIBUTOR owning RP is denied a write to an OI indicator" (X54).

## Phase 3 — auth and shell

`node scripts/smoke.mjs` against `npm run dev` → **115/115 checks pass**.

- Signed out: `/` → 307 to `/login`; `/login` renders the form; bad credentials
  issue no session cookie.
- Each of the six accounts signs in through `/api/auth/callback/credentials`
  and receives a session cookie.
- Nav differs by role: contributor 3 items (`/`, `/data`, `/method`);
  leadership 6 (`+ /gaps /plan /scenarios`); IQAC 9 (`+ /data/review /cycles
  /settings`).
- Routes outside a role's set return 307 to `/`; routes inside return 200.
- Readout strip with the band ruler is present on every signed-in page;
  contributors see no composite and no parameter score text.

## Phase 4 — data entry and review

`npx vitest run tests/integration/workflow.test.ts` → **16/16 pass** (real
server actions against an isolated `prisma/test.db`; only the session lookup
and `revalidatePath` are mocked).

- `research@ssu.edu` saves X16 = 1300 → status DRAFT, `EntryLog` row
  (1240 → 1300, "Research Cell"); composite dips (unverified values do not
  count).
- `research@ssu.edu` writing X54 (OI) → refused: "cannot edit X54 (OI)";
  stored value untouched.
- Derived id X5, negative value, non-http evidence URL, malformed payload → all
  refused by Zod.
- `research@ssu.edu` submits RP → 1 entry SUBMITTED; submitting GO refused.
- `vc@ssu.edu` cannot save or review.
- `iqac@ssu.edu` verifies → VERIFIED; composite equals
  `composite({...SAMPLE, X16: 1300})` exactly and differs from 46.7236.
- Reject → REJECTED → contributor re-save → DRAFT → IQAC direct save → VERIFIED.
- IQAC saves land VERIFIED; clearing a value → EMPTY.
- `/data/review` (smoke) renders the queue with the diff column against 2025.

## Phase 5 — diagnosis and planning

- Smoke, as IQAC and leadership: `/plan` shows the feasibility verdict — with
  the seed (composite 46.7 against Top 100 = 42) it reads "On track. At the
  current push the composite clears 42 in 2026, ahead of your target year.
  Consider raising the target band." — and the 2027 block lists six movers
  (Placement percentage, Library and digital resources, Industry
  collaborations, Professional certification outcomes, Laboratory and
  learning-resource spend, Total academic programmes); the `target 42` line is
  drawn. Signed-in visits to `/login` redirect to `/`. `/gaps` renders five parameter
  bars with target markers, the priority table with five rows and the top-16
  leverage table. `/scenarios` renders the sliders, presets and the seeded
  "Steady push" scenario. `/cycles` lists 2025 (locked) and 2026 with the trend
  chart.
- Workflow suite: IN_REVIEW freezes contributors but not IQAC; LOCKED freezes
  both and sets `lockedAt`; leadership cannot manage cycles; creating 2027
  copies 64 entries as DRAFT with the 2026 values, moves the base year to 2027,
  scores 0 until re-verified, and a second create is refused while 2027 is
  open. Leadership saves and deletes a scenario; contributor cannot; push > 6
  and empty name refused. IQAC changes the goal and bands; non-increasing
  bands, target year ≤ base year, and an unknown peer band are refused;
  leadership cannot change settings. IQAC adds a user (email lower-cased,
  password bcrypt-verified), edits role and password, cannot delete or demote
  self, deletes; leadership cannot add users.
- Component suite (`tests/components/`, 23 tests): band ruler segments,
  target, markers and edited thresholds; data form live meter, derived rows,
  contributor scoping, save/submit/refusal; scenario lab recompute, presets,
  save, compare and apply; nav longest-match and badge; status chips;
  readiness bars.

## Phase 6 — finish

- `npm run check` (`tsc --noEmit && eslint . && vitest run`) → **clean, 8 files,
  77/77 tests**.
- `npx next build` → compiled successfully; every app route dynamic, `/login`
  static, middleware 87 kB.
- `npm run dev` → serving on http://localhost:3000.
- README with setup steps and the credentials table; `.env.example` committed,
  `.env` and `prisma/*.db` git-ignored.

## Quality floor

- TypeScript strict, no `any`, no `@ts-ignore` (`tsc --noEmit` clean).
- Every server action validates with Zod and calls `can()` before the database
  (`lib/actions/*.ts`); pages call `can()` and redirect.
- Responsive to 375px (grid collapses at 860/720/560/420px); `:focus-visible`
  outline; `prefers-reduced-motion` honoured; labels on every input
  (`htmlFor`/wrapping `label`, `sr-only` where the table layout hides them).
- Numbers formatted `en-IN` via `fmt()`; `font-variant-numeric: tabular-nums`
  on `body`.
- Dark-mode token blocks kept verbatim; theme toggle persists in
  `localStorage` and is applied before paint.
