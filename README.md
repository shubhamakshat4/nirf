# NIRF Readiness Portal

A multi-user portal that collects NIRF indicator data from departments, diagnoses
institutional readiness against rank bands, and plans a year-by-year path to a
target band. Built from the calibrated single-file prototype in
[`reference/nirf-readiness-console.html`](reference/nirf-readiness-console.html);
the scoring engine is ported verbatim into `lib/engine/` and covered by the
fixtures in `SPEC.md`.

**Stack:** Next.js 15 (App Router, TypeScript strict), Tailwind CSS v4, Prisma +
SQLite, Auth.js v5 (credentials, bcrypt), Vitest + Testing Library, Recharts.
No Docker, no cloud account.

## Setup

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET to any long random string
npx prisma migrate dev        # creates prisma/dev.db and generates the client
npm run seed                  # loads Sri Sri University with two cycles and six users
npm run dev                   # http://localhost:3000
```

`npm run setup` runs the migration and the seed in one go. The seed is
idempotent — run it again to reset the data.

### Scripts

| Script              | What it does                                                    |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Dev server on http://localhost:3000                             |
| `npm run build`     | Production build                                                |
| `npm test`          | Vitest: engine, `can()`, components, and the workflow suite     |
| `npm run check`     | `tsc --noEmit && eslint . && vitest run`                        |
| `npm run seed`      | Reseed the database and print the credentials table             |
| `npm run db:migrate`| `prisma migrate dev`                                            |
| `node scripts/smoke.mjs` | HTTP walk of every route as every role against a running dev server |

## Credentials

Every account uses the password **`nirf1234`**.

| Email                  | Role        | Owns |
| ---------------------- | ----------- | ---- |
| `iqac@ssu.edu`         | IQAC        | all  |
| `vc@ssu.edu`           | LEADERSHIP  | all (read) |
| `research@ssu.edu`     | CONTRIBUTOR | RP   |
| `placement@ssu.edu`    | CONTRIBUTOR | GO   |
| `admissions@ssu.edu`   | CONTRIBUTOR | OI   |
| `registrar@ssu.edu`    | CONTRIBUTOR | TLR  |

## How it works

### Roles

Authorisation lives in one place, `lib/auth/can.ts`, and every server action
and page calls it before touching the database. The UI mirrors it but never
stands in for it.

- **CONTRIBUTOR** — sees and edits only the indicators inside its owned
  parameters, only while the cycle is `DRAFT`. Saves land as `DRAFT`; "Submit to
  IQAC" moves them to `SUBMITTED`. Sees no scores — the readout strip shows data
  readiness and the band ruler without score markers.
- **IQAC** — reads everything, verifies or rejects submissions, edits any value
  (IQAC saves land as `VERIFIED`), moves the cycle through
  `DRAFT → IN_REVIEW → LOCKED`, edits the goal and band thresholds, manages users.
- **LEADERSHIP** — reads everything, runs and saves scenarios, cannot edit
  entries or settings.

### Data and scoring

- Only the 64 enterable indicators get `Entry` rows. The 15 derived ones (X5,
  X10, X21, X39, X42, X46, X49, X53, X55, X57, X67, X70, X73, X74, X77) are
  computed at read time and never stored.
- **Only `VERIFIED` values count toward the composite.** An unverified number is
  a claim, not evidence, and scores zero — so editing a verified value drops it
  out of the score until IQAC re-verifies it. The `/data` meters are live and
  reflect whatever is typed; the composite on `/` does not move until
  verification.
- Every value change appends an `EntryLog` row (old value, new value, who, when).
- Cycles are one per year. Creating the next cycle copies every value across as
  `DRAFT` so departments re-confirm them, and moves the institution's base year
  to the new cycle. A cycle can only be created once the previous one is locked.
- Scores are computed on the server and passed down. The scenario sliders
  recompute in the browser with the same `lib/engine` module.

### Routes

| Route          | Who                 |
| -------------- | ------------------- |
| `/login`       | all                 |
| `/`            | all (role-specific) |
| `/data`        | contributor, IQAC (leadership read-only) |
| `/data/review` | IQAC                |
| `/gaps`        | IQAC, leadership    |
| `/plan`        | IQAC, leadership (`?scenario=<id>` plans at a saved push) |
| `/scenarios`   | IQAC, leadership    |
| `/cycles`      | IQAC                |
| `/settings`    | IQAC                |
| `/method`      | all                 |

### Moving off SQLite

Change `provider` in `prisma/schema.prisma` to `postgresql`, point
`DATABASE_URL` at the server, and run `npx prisma migrate dev`. Every query is
behind `lib/db/*.ts`; status fields are strings validated at the application
boundary rather than database enums, so no schema logic changes.

## Engine notes

`lib/engine/` is a typed, pure port of the prototype's `<script>` block. The
global `S` object is gone; every function takes an `EngineConfig`
(`category, goal, bands, peer, sizeNorm, baseYear, targetYear`).

**One deliberate deviation from the shipped HTML.** The prototype file carries
`min: 0.2` on X49 ("PhD graduates", a derived duplicate of X31). Every
calibrated figure in `SPEC.md` §3 — all three composites, all fifteen parameter
scores, all nine arrival years, the three year-5 scores and the `requiredFactor`
case — reproduces to four decimals only with a floor of **1** on X49; with 0.2,
GO comes out 0.19–0.24 higher on every fixture and nothing else differs. The spec
says the calibrated numbers are the truth, so X49's floor is 1 in
`lib/engine/indicators.ts`, with a comment at the row. No other weight, floor,
ceiling, pace or lag was changed.

The composite is a readiness index of this model's own construction, not the
published NIRF score. The Method page carries the prototype's caveats verbatim:
band thresholds are indicative, sub-weights are rationale-based rather than
empirically fitted, and X71–X79 are researcher-defined predictors rather than
official NIRF perception inputs.

## Tests

- `tests/engine.test.ts` — the §3 fixtures (SAMPLE, WEAK, `{X1: 3000}`) for
  composite and parameter scores, arrival years, year-5 scores, derived-value
  recomputation, sub-weight sums, sizeNorm, lag behaviour, movement cap and
  `requiredFactor`. Prints a computed-vs-expected table.
- `tests/can.test.ts` — the authorisation matrix, including the RP contributor
  denied a write to an OI indicator.
- `tests/components/` — band ruler, data form (live meter, derived rows, save,
  submit, refusals), scenario lab (browser recompute, presets, save, compare),
  nav rail, status chips, readiness bars.
- `tests/integration/workflow.test.ts` — the real server actions against an
  isolated `prisma/test.db`: contributor edit → submit → IQAC verify → composite
  moves; reject and resubmit; IN_REVIEW/LOCKED gates; next-cycle creation;
  scenarios; settings validation; user management.
- `scripts/smoke.mjs` — signs in as every seeded account through the Auth.js
  credentials flow and checks status codes and role-specific content on every
  route.

See `CHECKPOINTS.md` for the phase-by-phase record.
