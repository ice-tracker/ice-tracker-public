# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Next.js dev server with Turbopack
npm run build     # Type-check, generate Prisma client, and compile
npm run lint      # ESLint check
npm start         # Production server
```

There is no test suite. TypeScript is configured with `"strict": false`.

After any schema change, run:
```bash
npx prisma generate   # Regenerates the Prisma client
npx prisma migrate dev --name <migration-name>  # Creates a new migration
```

## Architecture

**ice-tracker** is a Next.js 16 (App Router) + PostgreSQL application for crowdsourced reporting of ICE enforcement activity in Massachusetts. The key design concern is **privacy**: real coordinates for sensitive locations are never exposed to the client.

### Route Map

| Route | Purpose |
|---|---|
| `/` | Interactive OpenLayers map (main view) |
| `/report` | Multi-form submission (sighting, verified arrest, bulk CSV upload) |
| `/data` | Filterable/sortable data table with CSV export |
| `/statistics` | Town-level aggregate stats and choropleth map |
| `/api/submit` | `POST` — create reports; enforces deduplication and anonymization; writes audit log |
| `/api/points` | `GET` — all *visible* reports (anonymized coordinates only). Admin-only `?includeHidden=true` also returns hidden ones |
| `/api/reports/[id]` | `PATCH` — toggle a report's visibility (`{ hidden, reason? }`); requires signed-in session; writes audit log atomically. **There is no delete route** — see Report visibility |
| `/api/reports/duplicates` | `GET` — exact/related duplicate report groups for the admin review tab (admin-only) |
| `/api/logs` | `GET` — audit log entries (admin-only: requires signed-in session) |
| `/api/poi` | `GET` — Places of Interest (courts, detention centers, etc.); `POST` — creates a new POI row (admin-only) |
| `/api/flock` | `GET` — Flock Security LPR camera locations; `POST` — creates a new Flock camera row (admin-only) |
| `/api/town-stats` | `GET` — **DDP** arrest/detainer counts by town (Deportation Data Project; feeds the choropleth + "Town-Level Stats" toggle) |
| `/api/luce-area-stats` | `GET` — **LUCE** report counts for a town/county, broken down by `Activity` + total `NumAbducted`; query params `town` \| `county` (one required), optional `dateStart`/`dateEnd` (`YYYY-MM-DD`). Point-in-polygon over `towns.json` using anonymized coords (matches the map dots); returns aggregate counts only |
| `/api/census-population` | `GET` — **Census** population estimates: `{ year, cities, counties }`, keyed by UPPERCASE place name. Newest loaded vintage; 404 if none. Feeds the Population row on the DDP area card |
| `/api/geocode` | `GET` — reverse geocoding via Google Maps API |
| `/api/road-geometry` | `GET` — street-level geometry for OnlyStreet reports |
| `/api/valid-access-code` | `POST` — validates bulk-upload access codes |

### Admin gate

Any signed-in Clerk user is treated as an admin. There is no separate role or permission check. Server-side enforcement lives in `src/lib/server/auth.ts` via two helpers:

- `requireAdmin()` — returns `{ ok, userId, email }` or `{ ok: false, status: 401 }`. Used in `PATCH /api/reports/[id]`, `GET /api/logs`, `GET /api/reports/duplicates`, `POST /api/poi`, `POST /api/flock`, and — for the `?includeHidden=true` flag only — `GET /api/points`.
- `getOptionalActor()` — returns `{ userId }` (null for anonymous). Used in `POST /api/submit` to attribute uploads.

Client-side, `useUser().isSignedIn` from `@clerk/nextjs` controls whether the Visibility column and Logs tab are rendered.

### Audit log (`AuditLog` table)

Every successful upload and every visibility change writes a row to `AuditLog`. Key fields:

| Field | Meaning |
|---|---|
| `action` | `"upload"`, `"hide"`, or `"unhide"`. `"delete"` appears only on rows written before hiding replaced deletion |
| `resource` | `"report"` or `"test_report"` (respects `USE_TEST_TABLE`) |
| `resourceId` | The `Report.id` at time of action |
| `actorId` | Clerk `userId`; `null` for anonymous public uploads |
| `actorEmail` | Email captured at action time |
| `batchId` | UUID shared across all rows of one bulk-upload session |
| `source` | `"single"` / `"bulk"` / `"sighting"` / `"verified"` |
| `snapshot` | Full JSON copy of the row as it stood *before* the action |

The Logs tab on the `/data` dashboard shows this table and is only visible/accessible to signed-in users.

### Anonymization (`src/lib/server/anonymization.ts`)

The most critical piece of backend logic. When a report's `LocationType` is `home` or `workplace`, the real coordinates are displaced to a nearby populated area before being stored. The radius ladder is 0.15 mi → 0.5 mi → 1.5 mi → 2.0 mi, each checked against the WorldPop API for ≥500 population. The API always returns `RandomLatitude`/`RandomLongitude` and never the real `Latitude`/`Longitude`.

There are actually two distinct jitter mechanisms — worth not conflating:

- **At submission time** (`POST /api/submit` → `processPoint()`), the offset uses plain `Math.random()` (no seed at all) and is computed once, then persisted permanently into `RandomLatitude`/`RandomLongitude`. It is not reproducible — only the stored result survives. This is the path almost all reports take.
- **At read time, legacy-only** (`GET /api/points`, for old rows with no location type, i.e. `Location === "(empty)"`), the offset is computed fresh on *every request* via `createDeterministicRandom()`, seeded with `ANONYMIZATION_SEED_SECRET + reportId + coords`. It has to be deterministic here specifically because it's recomputed every time instead of stored — otherwise the point would visually jump on every page load. `ANONYMIZATION_SEED_SECRET` only affects this legacy fallback path, not the primary submission-time jitter.

### Database

Two parallel Prisma models: `Report` (production) and `Test_Report` (staging). The active table is toggled by `USE_TEST_TABLE` — checked as the exact string `"true"`, not just any truthy value — **consistently across the read, write, and admin paths**: `GET /api/points`, `GET /api/luce-area-stats`, `POST /api/submit`, `PATCH /api/reports/[id]`, and `/api/reports/duplicates`. (`GET /api/points` previously keyed off `NODE_ENV`, which could make dev reads and writes disagree about the active table — e.g. a dev submission written to `Report` wouldn't appear on a map reading `Test_Report`. It now uses `USE_TEST_TABLE` like everything else.) The `prisma.ts` singleton still switches on `NODE_ENV` for the standard Next.js connection-pool-caching pattern, which is unrelated to table selection.

Key `Report` fields: `Latitude`, `Longitude`, `RandomLatitude`, `RandomLongitude`, `LocationType`, `ActivityType`, `Date`, `RelReportID` (self-referential for grouping related reports), `SubmissionType`, `Hidden` (see Report visibility).

Other models in `prisma/schema.prisma`, each backing one route above: `Place_Of_Interest` (`/api/poi`), `Flock_Camera` (`/api/flock`), `Arrest` and `Detainer` (both feed `/api/town-stats`), and `AuditLog` (see above).

`Census_City_Population` / `Census_County_Population` (feeding `/api/census-population`) hold Census Bureau population estimates for the 351 MA municipalities and 14 counties. `City`/`County` are stored **UPPERCASE** to join `towns.json` `TOWN`/`COUNTY` and the map's `filterTown`/`filterCounty` with no normalization; the `Year` column lets a new vintage load alongside 2025. `Census_City_Population` also stores `County` directly — the one place county is not derived from `towns.json` at runtime. `USE_TEST_TABLE` does not apply: public reference data has no staging copy.

#### Local DB dumps are never committed

`/db-export/` and `/export_csv.ps1` are gitignored and must stay that way. `db-export/Report.csv` is a raw table dump carrying the real `Latitude`/`Longitude` columns — the un-anonymized coordinates this app's whole design exists to keep off the client — and `export_csv.ps1` holds a database credential inline in its `param()` block. Both sat untracked but *unignored* for a while, where a single `git add -A` would have committed them. Regenerate either freely; do not stage it.

#### `Activity` vocabulary: Sighting / Abduction, plus legacy values still in the DB

`Activity` has exactly two valid values, defined once in [`src/constants/incident.ts`](src/constants/incident.ts) as `INCIDENT_TYPES`: **`"Sighting"`** and **`"Abduction"`**. Abductions also carry a `NumAbducted` count of people taken — a different number from the count of abduction incidents, so don't conflate the two.

The database still holds the older free-form vocabulary (`"Arrest"`, `"Attempted Arrest"`, `"Presence"`, `"Vehicle Sighting"`) because the data has **not** been reloaded yet. The plan is wipe-and-reload, not an in-place `UPDATE` — see [`docs/luce-migration.md`](docs/luce-migration.md), which truncates `Report` and re-imports from LUCE. Until that runs, both vocabularies are live at once.

**Anything that buckets an `Activity` value must call `activityToIncidentType()`** from `src/constants/incident.ts` rather than comparing strings itself. It maps legacy values forward (`Arrest` → Abduction; `Presence`, `Attempted Arrest`, `Vehicle Sighting` → Sighting) and defaults unknown values to Sighting, deliberately: Sighting is the less severe classification, so an unrecognised value can never inflate the abduction count. There is no catch-all "Other" bucket — an unrecognised value landing somewhere vague is how abductions were previously miscounted.

The reason this is centralised: the map's area card (`MapSection.tsx`) and `GET /api/luce-area-stats` compute the same aggregate through separate code paths, and when each had its own copy of the mapping they drifted apart. `OLMap.tsx`'s marker `activityMapping` and cluster-donut counter do the same job for styling and are worth keeping consistent with it.

`BulkUploadComponent` derives the value from LUCE's combined "Incident Description" cell via `parseIncidentDescription()`, which also extracts `NumAbducted`.

### Data sources: LUCE vs DDP vs Census (do not mix)

The app surfaces **three unrelated datasets** that all live in this database:

- **LUCE** — the community-submitted reports (`Report`/`Test_Report`, tagged `CreatedBy` defaulting to `"LUCE"`). These are the **dots on the map**, served by `/api/points`, and aggregated per area by `/api/luce-area-stats`. LUCE is the primary data the map shows.
- **DDP** — the Deportation Data Project's official arrest/detainer stats (`Arrest`, `Detainer`), served by `/api/town-stats`. DDP appears **only** through the choropleth + the bottom "Town-Level Stats" toggle — that toggle is the *only* DDP surface in the UI.
- **Census** — U.S. Census Bureau population estimates, served by `/api/census-population`. Reference data, never an incident count. Its surfaces are the **Population** row on the DDP area card in `MapSection.tsx` and, behind that card's "Show per capita" checkbox, the denominator of the per-100k rates.

Keep them separate: a LUCE view (map dots, county/town filter cards) must show LUCE numbers; DDP numbers appear only via the Town-Level Stats toggle. If a DDP-sourced figure is ever shown inside a LUCE view, label it "(from DDP)". (A past bug had the county/town filter card showing DDP arrest/detainer counts — fixed on `SAJ/fix-filter-card-info`.)

Census needs the same labelling: the Population row sits on the DDP card, so it is credited separately in **both** `ddpSourceNote` and the shared `.areaTabDiffLine` (the footnote is hidden when the card is tabbed), with the year read from the API response.

#### Per-capita rates (`src/lib/perCapita.ts`)

The DDP card's **"Show per capita"** checkbox annotates each count with a per-100k rate against the Census population. Do the arithmetic through `perCapitaRate()` / `formatPerCapitaRate()` rather than inline — the threshold and rounding are judgement calls that a second copy would drift from, the same reason `activityToIncidentType()` is centralised.

**A DDP rate is not a residents-arrested-per-head figure**, for two reasons that must stay visible wherever a rate is:

- DDP keys arrests to an apprehension-site landmark (`public/files/site_town_map.json`) and detainers to a facility city, so a town hosting a facility or ICE office absorbs counts for non-residents and reads high against its own population.
- `townStats` is date-filtered, so the numerator is the selected window while the denominator is a population — "per 100k over the dates selected", never an annual rate.

Both are stated on the card whenever the toggle is on. That caveat lives in the card **body**, not `ddpSourceNote`: the footnote is dropped when the card is tabbed, and the shared `.areaTabDiffLine` would show it on the LUCE tab too.

`perCapitaRate()` returns `null` — never `0` or `NaN` — when the population is unknown or under `MIN_POPULATION_FOR_RATE` (1,000). Massachusetts has towns down to ~488 people, where one arrest is 205 per 100k, a figure driven entirely by the denominator; those render as an explained "—". The raw count always stays beside the rate, since a rate shown alone reads as a count.

The **choropleth is still keyed to raw counts** and the toggle does not touch it.

#### Loading Census data

```bash
node prisma/scripts/clean_census_csv.cjs   # data/city_subestimate.csv -> data/census_{city,county}_2025.csv
node prisma/scripts/import_census.cjs      # those CSVs -> Postgres, idempotent
```

The cleaner reads `SUMLEV=061` (all 351 municipalities), **not** `SUMLEV=162` (58 legal cities only, which would leave 293 towns blank), and refuses to write unless names resolve in `towns.json` and per-county sums reconcile. No CSV under `data/` is committed (`/data/*.csv` is ignored) — they are all reproducible. The input is the Census SUB-EST file for MA, [`sub-est2025_25.csv`](https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025_25.csv), saved as `data/city_subestimate.csv`; both scripts name what is missing if you skip a step. Ignore `data/county_subestimate.csv` — despite the name it holds **no county rows**; counties come from `SUMLEV=050` in `city_subestimate.csv`. The scripts sit in `prisma/scripts/` because `.git/info/exclude` has a bare `scripts` pattern that matches at any depth, re-included via `!/prisma/scripts/`.

### Map (`src/components/map/OLMap.tsx`)

~1200-line OpenLayers component. It renders clustered point layers for reports, POIs, and Flock cameras. Sidebar panels (`left-bar/`) show event details, POI info, and camera info. URL query params `?point=id`, `?poi=id`, `?camera=id` open the corresponding sidebar panel on load.

### Report visibility (there is no delete)

Admins do not delete reports — they hide them. `Report.Hidden` / `Test_Report.Hidden` (boolean, default `false`) is flipped by `PATCH /api/reports/[id]` with a JSON body `{ hidden: boolean, reason?: string }`. The row stays in the database; only its visibility moves. (The old `DELETE /api/reports/[id]` handler is gone.)

Hidden means **strictly** hidden — there is no query param, export, or aggregate a visitor can use to observe a hidden report. Every path a client can reach filters on `Hidden: false` **in the database query**, so hidden rows are never serialized at all:

| Path | Behavior |
|---|---|
| `GET /api/points` | `where: { Hidden: false }`. A signed-in admin may pass `?includeHidden=true` — validated with `requireAdmin()`; for anyone else the flag is silently ignored rather than erroring, so an expired session degrades to the public view instead of a broken page. Marked `dynamic = "force-dynamic"` because the response varies by auth. |
| `GET /api/luce-area-stats` | `where: { Hidden: false }`. Hidden reports contribute nothing to the town/county totals — otherwise hiding a report would remove its dot while leaving a `+1` in the count, leaking its existence through the numbers. |
| `GET /api/reports/duplicates` | `where: { Hidden: false }` on every `groupBy`/`findMany`. Hiding a report *is* how an admin resolves a duplicate, so a resolved group collapses instead of reappearing. |
| CSV export on `/data` | `exportableReports` filters `Hidden` out before the data reaches `ExportButton` — the CSV is the one place an admin could accidentally pass a hidden report on. |
| The map (`MapSection.tsx`) | Reads plain `/api/points` with no flag, so hidden reports are invisible there **even to admins**. The map is always exactly the public view. |

`POST /api/submit`'s duplicate checks deliberately *do* match hidden rows: re-submitting a report an admin hid must keep returning 409 rather than quietly creating a fresh visible copy of it.

Where admins see and manage hidden reports: the Reports tab on `/data` only. Signed in, the page fetches `/api/points?includeHidden=true`, greys hidden rows (`.hiddenRow`), tags them with a "Hidden" badge, and renders a `ReportVisibilityToggle` (eye / eye-off) in a `Visibility` column. The Duplicates tab uses the same toggle, and its "Hide the rest, keep selected" button `PATCH`es each non-keeper with an auto-filled reason.

Every flip writes an `AuditLog` row with `action: "hide" | "unhide"`, a pre-change `snapshot`, and the optional free-text `reason` (surfaced as a Reason column in the Logs tab). Flipping a report to the state it is already in is a no-op and writes nothing.

### Report Deduplication

On `POST /api/submit`, the server first checks for an exact match on `(Date, Latitude, Longitude, Location)` (returns 409). It also queries for reports within 0.5 km using Haversine distance and links them via `RelReportID`.

### Authentication

`src/middleware.ts` is just `clerkMiddleware()` with no `auth().protect()` call — it does not itself block or redirect anyone. What it actually does is make Clerk's auth context (`auth()`) available on every route matched by its config (the matcher skips static assets but always runs on `/api`). Actual authorization is enforced ad hoc, per route/page: `requireAdmin()` in the API routes listed in the Admin gate section, and plain `isSignedIn` checks in client components.

On `/report`, signed-out visitors get the sighting form only (submissions stay anonymous via the open `POST /api/submit`); signing in unlocks the verified-arrest and bulk-upload tabs. (History note: the original login feature shipped this way, a June 2025 file restructure accidentally dropped the public sighting form, and it has since been restored.)

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `USE_TEST_TABLE` | Set to the exact string `true` (checked with `=== "true"`) to use `Test_Report` instead of `Report`. Consulted by **all** report read/write paths — `GET /api/points`, `GET /api/luce-area-stats`, `POST /api/submit`, `PATCH /api/reports/[id]`, `/api/reports/duplicates` (see Database section) |
| `ANONYMIZATION_SEED_SECRET` | Secret seed for deterministic coordinate jitter — only affects the legacy no-location-type fallback in `GET /api/points`, not the primary submission-time jitter (see Anonymization section) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key (inlined into the browser bundle — the `NEXT_PUBLIC_` prefix is what makes that happen) |
| `CLERK_SECRET_KEY` | Clerk secret key (server-only) |
| `GMAPS_API_KEY` | Used by `/api/geocode` (previously mis-documented here as `GOOGLE_MAPS_API_KEY` — that name does not exist in the code) |
| `ACCESS_CODE_MAP` | JSON string mapping bulk-upload access codes to org names, e.g. `{"CODE123":"OrgName"}`. Read by `POST /api/valid-access-code`; without it that route returns a 500. Previously undocumented. |

## CI/CD

Two GitHub Actions workflows:
- **build-check.yml** — runs `lint` + `build` on every push to `main`
- **sync-to-public.yml** — after a successful build, syncs the repo to a public mirror (`ice-tracker-public`) using an orphan branch (strips history)
