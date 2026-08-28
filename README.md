## Inspiration

With the current administration, the need for transparency over ICE's activities is greater than ever. Immigrants live in fear of raids and advocates often lack enough information to understand trends or identify illegal tactics. The current system advocates use to track ICE activities requires manual entry of information. With the speed ICE can move at, immigrants and advocates need a faster way to communicate information with each other and the public. Our project addresses this by creating a live map of Massachusetts that can be easily updated with new arrests such that this information is more readily available to all.

## What it does

Our website contains an interactive map with live updates of ICE activities. Users can submit forms to report unverified ICE activity. These forms are stored and used by the map to plot activity based on longitude and latitude.

## Tech stack

- **Next.js 16** (App Router, Turbopack dev server) + React 19 + TypeScript (`strict: false`)
- **PostgreSQL** via **Prisma** ORM
- **Clerk** for authentication (any signed-in user = admin, see below)
- **OpenLayers (`ol`)** for the interactive map
- No test suite currently exists.

## Getting started

```bash
npm install
npx prisma generate          # generate the Prisma client
npx prisma migrate dev        # apply migrations to your local DB
npm run dev                   # start the dev server (Turbopack)
```

Other scripts:

```bash
npm run build     # type-check, prisma generate, compile
npm run lint       # ESLint
npm start          # production server
```

After changing `prisma/schema.prisma`:

```bash
npx prisma generate
npx prisma migrate dev --name <migration-name>
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `USE_TEST_TABLE` | Truthy value → reads/writes go to `Test_Report` instead of `Report` |
| `ANONYMIZATION_SEED_SECRET` | Secret seed for deterministic coordinate jitter |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `GMAPS_API_KEY` | Used by `/api/geocode` (not `GOOGLE_MAPS_API_KEY` — that name doesn't exist in the code) |
| `ACCESS_CODE_MAP` | JSON string mapping bulk-upload access codes to org names, e.g. `{"CODE123":"OrgName"}`. Read by `POST /api/valid-access-code`. |

## Project structure

```
prisma/
  schema.prisma            # Report, Test_Report, Place_Of_Interest, Flock_Camera, AuditLog, Arrest, Detainer models

src/
  middleware.ts             # clerkMiddleware() — attaches auth context on every route, doesn't itself block anything

  app/
    page.tsx                 # "/" — interactive map (main view)
    report/page.tsx           # "/report" — sighting / verified-arrest / bulk CSV submission forms
    data/page.tsx              # "/data" — filterable/sortable table + CSV export + audit log tab
    statistics/page.tsx        # "/statistics" — town-level choropleth + aggregate stats
    about-us/, how-to-submit/  # static content pages

    api/
      submit/route.ts               # POST — create a report (dedup + anonymization + audit log)
      reports/[id]/route.ts          # DELETE — hard-delete a report (admin-only, audit log)
      reports/duplicates/route.ts     # GET — groups existing duplicate reports for the admin review tab (admin-only)
      points/route.ts                 # GET — public reports (anonymized coords only)
      logs/route.ts                    # GET — audit log (admin-only)
      poi/route.ts                      # GET — Places of Interest
      flock/route.ts                     # GET — Flock Security LPR camera locations
      town-stats/route.ts                 # GET — DDP arrest/detainer counts by town (Deportation Data Project)
      luce-area-stats/route.ts             # GET — LUCE report counts by activity for a town/county (?town|?county, optional ?dateStart/?dateEnd)
      geocode/route.ts                     # GET — reverse geocoding (Google Maps API)
      road-geometry/route.ts                # GET — street geometry for OnlyStreet reports
      valid-access-code/route.ts             # GET — validates bulk-upload access codes

  components/
    map/OLMap.tsx              # ~1200-line OpenLayers map component (clustered layers, sidebar panels)
    map/left-bar/                # filter panel (date, county/town, incident type, …) + event/POI/camera detail panels
    forms/                        # SightingFormComponent, UnverifiedFormComponent, BulkUploadComponent, ...
    data/                          # DataTable, DataFilters, ExportButton, DeleteReportButton, DuplicatesPopover,
                                     # DuplicatesReviewPanel (admin-only duplicate cleanup tab), ...
    taskbar/                        # top nav

  lib/
    prisma.ts                   # Prisma client singleton (avoids connection-pool exhaustion in dev)
    useTownBoundaries.ts        # loads towns.json; county/town lists + point-in-polygon helpers for the map's area filter
    server/
      anonymization.ts           # coordinate jitter logic for sensitive locations
      auth.ts                     # requireAdmin() / getOptionalActor() — Clerk-based server auth helpers
      audit.ts                     # writeAuditLog() helper used by /api/submit

  types/data.ts               # shared frontend TS interfaces (PointData, LogEntry, etc.)
  constants/data.ts           # static reference data

ddp/process_ddp.py         # standalone Python script, unrelated to the Report table —
                              # aggregates raw ICE DDP arrest/detainer spreadsheets into CSVs
                              # consumed by the statistics page

.github/workflows/
  build-check.yml            # lint + build on every push to main
  sync-to-public.yml          # after a successful build, mirrors repo to a public repo (history stripped)
```

## Core concepts

### Privacy / anonymization (`src/lib/server/anonymization.ts`)

When a report's `LocationType` is `home` or `workplace`, real coordinates are jittered to a nearby populated area (≥500 people, radius ladder 0.15 → 0.5 → 1.5 → 2.0 miles) before being stored. The API (`/api/points`) only ever returns `RandomLatitude`/`RandomLongitude`, never the real `Latitude`/`Longitude`. The jitter is only **deterministic** (seeded via `ANONYMIZATION_SEED_SECRET`) for legacy reports with no location type, since those are recomputed fresh on every `/api/points` request; the primary submission-time jitter uses plain `Math.random()` and is persisted once, so it's not reproducible. Full explanation in `CLAUDE.md`'s Anonymization section.

### Admin gate

Any signed-in Clerk user is treated as an admin — there's no separate role system. `requireAdmin()` (server-side, `src/lib/server/auth.ts`) gates `DELETE /api/reports/[id]`, `GET /api/logs`, `GET /api/reports/duplicates`, `POST /api/poi`, and `POST /api/flock`. Client-side, `useUser().isSignedIn` controls whether the delete button, Logs tab, and Duplicates tab render in `src/app/data/page.tsx`.

### Audit log (`AuditLog` table)

Every upload and delete writes a row via `writeAuditLog()` (or inline in the delete route), including a full JSON `snapshot` of the row — for deleted rows this snapshot is the only surviving record. Visible on the Logs tab of `/data`, admin-only.

## Report lifecycle — where the code lives

| Operation | File | Notes |
|---|---|---|
| **Create** | [`src/app/api/submit/route.ts`](src/app/api/submit/route.ts) | Only path that inserts a `Report`/`Test_Report` row. Runs dedup checks (below), anonymization, then `ReportModel.create(...)`, then a follow-up `update` to set `RelReportID = created.id` if no related report was found, then `writeAuditLog`. |
| **Update** | *(none)* | There is currently **no** PATCH/PUT endpoint for editing an existing report. The only `.update()` calls in the codebase are the `RelReportID` self-assignment right after creation, and a commented-out block in `submit/route.ts` (lines ~120–137) that would reassign `CreatedBy` on a duplicate instead of rejecting it. |
| **Delete** | [`src/app/api/reports/[id]/route.ts`](src/app/api/reports/%5Bid%5D/route.ts) | Admin-only (`requireAdmin()`), hard-deletes by `id` inside a `prisma.$transaction` alongside the audit log write, so the delete and its log entry succeed or fail together. Triggered from the UI by [`DeleteReportButton.tsx`](src/components/data/DeleteReportButton.tsx). |
| **Read (public)** | [`src/app/api/points/route.ts`](src/app/api/points/route.ts) | Strips real coordinates before returning. |

### Current deduplication logic (in `submit/route.ts`)

1. **Exact-match rejection**: `findFirst` on `(Date, Latitude, Longitude, Location)` — if found, the POST returns `409 Duplicate report exists` and nothing is inserted.
2. **Fuzzy-match linking (not rejection)**: `findMany` on `(Date, Location)`, then Haversine distance ≤ 0.5 km against each candidate. If a match is found, the new row's `RelReportID` is set to that candidate's `RelReportID` (or `id`) — grouping them as "related," but **both rows are still inserted**. This is what powers [`DuplicatesPopover.tsx`](src/components/data/DuplicatesPopover.tsx) on `/data` (it just filters `allReports` for matching `RelReportID`).

**Why duplicates can still slip in on our end:** the exact-match check is strict — any difference in `Date`/`Latitude`/`Longitude`/`Location` (rounding, re-geocoded coordinates, re-typed location string) bypasses it, and the fuzzy check only *links* rows, it never blocks or merges them. So duplicates that are "close" but not byte-identical land in the table as separate rows, connected only via `RelReportID`.

### Cleaning up existing duplicates — the admin "Duplicates" tab

Since there's no edit/merge endpoint, and the checks above only prevent *new* duplicates (imperfectly — see below), cleanup of rows already in the table happens through an admin-only "Duplicates" tab on `/data` (`GET /api/reports/duplicates` + `DuplicatesReviewPanel.tsx`). It groups existing rows into two tiers:

- **Exact duplicates** — identical `Date`, `Latitude`, `Longitude`, `Location`, `Activity`, and `Description`. Almost always a technical accident (double-submit, re-uploaded CSV). A "keeper" row is pre-selected (lowest `id`, or whichever has a filled-in `Description` if one doesn't) and the rest can be deleted in one click.
- **Related reports** — share a `RelReportID` but aren't byte-identical. These may be two different witnesses describing the same real event, so nothing is pre-selected — an admin reviews each one manually before deleting anything.

Deletion still goes through the existing `DELETE /api/reports/[id]` route (per-row, admin-gated, audit-logged) — the new endpoint only *finds* candidates, it doesn't add new delete logic.

**Known limitation / follow-up:** none of this stops *new* duplicates from being created. `POST /api/submit`'s exact-match check is a separate "look up, then insert" pair of database calls, not one atomic operation — two near-simultaneous identical requests (a double-click, a retried request on a flaky connection) can both pass the "no existing match" check before either finishes inserting. The fix would be a database-level unique constraint, e.g. `@@unique([Date, Latitude, Longitude, Location])` on `Report`/`Test_Report` in `prisma/schema.prisma`, applied via `npx prisma migrate dev --name add_report_unique_constraint`. That's intentionally left as a separate follow-up (it's a schema migration, higher risk than an additive UI feature) rather than bundled into the Duplicates tab work.
