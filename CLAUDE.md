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
| `/api/points` | `GET` — all reports (anonymized coordinates only) |
| `/api/reports/[id]` | `DELETE` — hard-delete a report; requires signed-in session; writes audit log atomically |
| `/api/logs` | `GET` — audit log entries (admin-only: requires signed-in session) |
| `/api/poi` | `GET` — Places of Interest (courts, detention centers, etc.) |
| `/api/flock` | `GET` — Flock Security LPR camera locations |
| `/api/town-stats` | `GET` — arrest/detainer counts by town |
| `/api/geocode` | `GET` — reverse geocoding via Google Maps API |
| `/api/road-geometry` | `GET` — street-level geometry for OnlyStreet reports |
| `/api/valid-access-code` | `GET` — validates bulk-upload access codes |

### Admin gate

Any signed-in Clerk user is treated as an admin. There is no separate role or permission check. Server-side enforcement lives in `src/lib/server/auth.ts` via two helpers:

- `requireAdmin()` — returns `{ ok, userId, email }` or `{ ok: false, status: 401 }`. Used in `DELETE /api/reports/[id]` and `GET /api/logs`.
- `getOptionalActor()` — returns `{ userId }` (null for anonymous). Used in `POST /api/submit` to attribute uploads.

Client-side, `useUser().isSignedIn` from `@clerk/nextjs` controls whether the delete button column and Logs tab are rendered.

### Audit log (`AuditLog` table)

Every successful upload and every deletion writes a row to `AuditLog`. Key fields:

| Field | Meaning |
|---|---|
| `action` | `"upload"` or `"delete"` |
| `resource` | `"report"` or `"test_report"` (respects `USE_TEST_TABLE`) |
| `resourceId` | The `Report.id` at time of action (survives hard delete) |
| `actorId` | Clerk `userId`; `null` for anonymous public uploads |
| `actorEmail` | Email captured at action time |
| `batchId` | UUID shared across all rows of one bulk-upload session |
| `source` | `"single"` / `"bulk"` / `"sighting"` / `"verified"` |
| `snapshot` | Full JSON copy of the row (for deleted rows, this is the only surviving record) |

The Logs tab on the `/data` dashboard shows this table and is only visible/accessible to signed-in users.

### Anonymization (`src/lib/server/anonymization.ts`)

The most critical piece of backend logic. When a report's `LocationType` is `home` or `workplace`, the real coordinates are displaced to a nearby populated area before being stored. The jitter is **deterministic** — seeded with `ANONYMIZATION_SEED_SECRET + reportId + coords` — so it is reproducible but not reversible. The radius ladder is 0.15 mi → 0.5 mi → 1.5 mi → 2.0 mi, each checked against the WorldPop API for ≥500 population. The API always returns `RandomLatitude`/`RandomLongitude` and never the real `Latitude`/`Longitude`.

### Database

Two parallel Prisma models: `Report` (production) and `Test_Report` (staging). The active table is toggled by the `USE_TEST_TABLE` environment variable. The `prisma.ts` singleton uses the standard Next.js pattern to avoid connection pool exhaustion in dev.

Key `Report` fields: `Latitude`, `Longitude`, `RandomLatitude`, `RandomLongitude`, `LocationType`, `ActivityType`, `Date`, `RelReportID` (self-referential for grouping related reports), `SubmissionType`.

### Map (`src/components/map/OLMap.tsx`)

~1200-line OpenLayers component. It renders clustered point layers for reports, POIs, and Flock cameras. Sidebar panels (`left-bar/`) show event details, POI info, and camera info. URL query params `?point=id`, `?poi=id`, `?camera=id` open the corresponding sidebar panel on load.

### Report Deduplication

On `POST /api/submit`, the server first checks for an exact match on `(Date, Latitude, Longitude, Location)` (returns 409). It also queries for reports within 0.5 km using Haversine distance and links them via `RelReportID`.

### Authentication

Clerk (`src/middleware.ts`) protects all routes. The matcher skips static assets but always runs on `/api`. The public sighting form does not require login; the verified-arrest and bulk-upload forms do.

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `USE_TEST_TABLE` | Set to any truthy value to use `Test_Report` instead of `Report` |
| `ANONYMIZATION_SEED_SECRET` | Secret seed for deterministic coordinate jitter |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `GOOGLE_MAPS_API_KEY` | Used by `/api/geocode` |

## CI/CD

Two GitHub Actions workflows:
- **build-check.yml** — runs `lint` + `build` on every push to `main`
- **sync-to-public.yml** — after a successful build, syncs the repo to a public mirror (`ice-tracker-public`) using an orphan branch (strips history)
