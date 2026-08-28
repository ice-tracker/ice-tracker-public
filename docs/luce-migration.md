# Luce Upload Migration Runbook

Status: **not yet applied**. This document only records the commands to run and
the order to run them in. Per the task constraints for this migration, no
`prisma migrate dev` / `prisma migrate deploy` / `prisma db push` has been run
against any database (dev, staging, or prod) as part of this change — only
`npx prisma generate` (pure client codegen, no DB connection) has been run so
far, against the schema edit described below.

**Topology note:** there is exactly one Postgres database — `Report` and
`Test_Report` are two tables inside it, not two separate databases.
`USE_TEST_TABLE` only switches which table application code reads/writes; it
has no effect on which database a migration runs against. There is no
separate staging database, so "apply the migration" happens exactly once,
against the one real DB, and affects both tables' DDL simultaneously. The
staged part of this runbook is the *data* (verify via `Test_Report` before
trusting real `Report` rows to it), not the schema change itself.

**Decision for this pass: squash + baseline first.** Instead of adding the
`LogID` migration on top of the existing 37 migration files, we're taking
this opportunity to collapse history into one clean baseline, because
`prisma/schema.prisma`'s `Arrest`/`Detainer` models have **no migration file**
creating them (see the old §6, now folded into this) — they exist from
out-of-band DDL. Squashing now captures the DB's real current state
faithfully (via direct introspection, not by trusting `schema.prisma`) and
closes that drift permanently. Follow this runbook in order.

## What changed in `prisma/schema.prisma`

One additive, non-destructive change, applied identically to both `Report`
and `Test_Report`:

```prisma
model Report {
  id              Int     @id @default(autoincrement())
  LogID           String? @unique   // <-- new field
  Date            String
  ...
}
```

- `LogID` is nullable — existing rows (and any manual-form submissions that
  never carry a `LogID`) are unaffected.
- It's `@unique` — this is what makes bulk re-uploads of the same Luce sheet
  idempotent (`POST /api/submit` checks `LogID` first, before the existing
  `(Date, Latitude, Longitude, Location)` check).
- No columns were dropped. `Agents` / `Cars` / `Tactic` remain in the schema
  (nullable, per the "keep nullable" decision) even though the new Luce feed
  and the reworked manual forms no longer populate them.
- `Activity` is unchanged as a `String` column — only its value domain
  changes going forward (`"Sighting"` / `"Abduction"` instead of
  `"Arrest"` / `"Attempted Arrest"` / `"Presence"` / etc).

## 1. Back up the database first

```bash
# Adjust host/user/db name to match DATABASE_URL
pg_dump "$DATABASE_URL" -F c -f "backup_pre_luce_$(date +%Y%m%d%H%M%S).dump"
```

Verify the dump file is non-empty and note its path before continuing. This
backup covers both the migration-history squash (step 2) and the LogID
migration (step 4) — neither should need it, but the squash step in
particular is rewriting shared bookkeeping, so don't skip this.

## 2. Squash migration history into one baseline

This replaces all 37 existing files under `prisma/migrations/` with a single
migration that reflects the database's *actual current state* — captured by
introspecting the live DB directly, not by trusting `schema.prisma` (which
already has the not-yet-applied `LogID` field in it). This is what finally
gives `Arrest`/`Detainer` a real migration file instead of undocumented
out-of-band DDL.

```bash
# 1. Capture the live DB's current schema as raw SQL (before LogID exists in it)
npx prisma migrate diff \
  --from-empty \
  --to-url "$DATABASE_URL" \
  --script > /tmp/baseline.sql

# 2. Sanity-check the output: it should CREATE TABLE every model in
#    schema.prisma EXCEPT the LogID column on Report/Test_Report, and it
#    should include Arrest and Detainer.
grep -c '^CREATE TABLE' /tmp/baseline.sql   # expect 7 (Report, Test_Report,
                                              # Place_Of_Interest, Flock_Camera,
                                              # AuditLog, Arrest, Detainer)
grep 'LogID' /tmp/baseline.sql               # expect no output

# 3. Delete the old migration files (git history keeps them recoverable —
#    no need for a parallel "archive" folder)
git rm -r prisma/migrations

# 4. Create the baseline migration folder and drop the captured SQL into it
mkdir -p prisma/migrations/0_baseline
cp /tmp/baseline.sql prisma/migrations/0_baseline/migration.sql

# 5. Mark it as already applied — this only writes a row to the
#    _prisma_migrations bookkeeping table, it does NOT run any DDL, because
#    the DB already matches this baseline exactly
npx prisma migrate resolve --applied 0_baseline
```

Commit the new `prisma/migrations/0_baseline/` folder (and the deletion of
the old ones) as its own commit, separate from the `LogID` migration in the
next step, so the "this is pure history bookkeeping, no schema change" intent
is easy to review.

## 3. Apply the schema edit + regenerate the Prisma client

The schema edit is already committed in this branch (`prisma/schema.prisma`).
Regenerate the client (already done once during development, but re-run
after pulling this branch on any other machine):

```bash
npx prisma generate
```

This does **not** touch the database — it only regenerates
`node_modules/@prisma/client` from the schema file.

## 4. Create and apply the LogID migration

With the baseline in place, this generates a normal, reviewable, additive
migration — and because there's only one real database (`Test_Report` and
`Report` are tables in it, not separate databases — see the topology note
above), running this applies it to **both tables immediately**:

```bash
npx prisma migrate dev --name add_logid_field
```

Expect the generated `prisma/migrations/<timestamp>_add_logid_field/migration.sql`
to contain exactly:

```sql
ALTER TABLE "Report" ADD COLUMN "LogID" TEXT;
CREATE UNIQUE INDEX "Report_LogID_key" ON "Report"("LogID");

ALTER TABLE "Test_Report" ADD COLUMN "LogID" TEXT;
CREATE UNIQUE INDEX "Test_Report_LogID_key" ON "Test_Report"("LogID");
```

Because the column is nullable and no existing row can violate the unique
constraint (`NULL` doesn't conflict with `NULL` in a Postgres unique index),
this is safe to run against tables with existing data — no backfill step,
no downtime. Existing `Report` rows (the ones about to be wiped in step 6)
are untouched by this; they just gain a `NULL` `LogID` until they're
replaced by the fresh import. In any other environment (CI, a teammate's
machine) that only needs the schema without re-diffing it, use
`npx prisma migrate deploy` instead — it applies existing migration files
as-is, non-interactively.

## 5. Verify via `Test_Report` before touching real data

Only the data is staged here — the schema change from step 4 already landed
on both tables. Point the app at `Test_Report` and rehearse the import first:

```bash
# In your local .env (or wherever this environment's env vars live):
USE_TEST_TABLE=true
```

```sql
TRUNCATE TABLE "Test_Report" RESTART IDENTITY;
```

Then re-import `data/2026.07.22_Data_Sample.xlsx` (or whatever the current
Luce export is) through the reworked Bulk Upload UI at `/report` → **Bulk
Upload** tab, and confirm:

- the map, legend, filters, and `/data` table all render the imported rows
  correctly (Sighting vs. Abduction styling, `NumAbducted` counts, etc.)
- manually submitting one Sighting and one Abduction through the plain
  `/report` form (no `LogID`) also works
- re-uploading the same sheet a second time reports 100% duplicates (every
  row hits the `LogID` pre-check and 409s)

## 6. Wipe & reload production `Report`

Only once step 5 looks right. Per the "wipe & reload" decision (no backfill
mapping of old Arrest/Attempted Arrest/Presence values to Sighting/Abduction
— legacy rows are simply replaced by a fresh Luce import):

```bash
USE_TEST_TABLE=false   # or unset
```

```sql
TRUNCATE TABLE "Report" RESTART IDENTITY;
```

`RESTART IDENTITY` resets the `id` autoincrement sequence back to 1, so the
freshly-imported rows get clean, low IDs. `RelReportID` values are
self-referential and get rebuilt naturally as rows are re-created through
`POST /api/submit`.

Re-import the current Luce export through Bulk Upload the same way as step 5.

## 7. Verification queries

Run these against `Report` after the real reload:

```sql
-- Row count matches the source sheet's row count
SELECT COUNT(*) FROM "Report";

-- Should be exactly two values: Sighting / Abduction
SELECT "Activity", COUNT(*) FROM "Report" GROUP BY "Activity";

-- Sec=true (anonymized) should roughly match rows whose Location Type
-- was Home / Apartments / a workplace-ish value in the source sheet
SELECT "Sec", COUNT(*) FROM "Report" GROUP BY "Sec";

-- LogID should be non-null and unique for every freshly-imported row
SELECT COUNT(*) AS total, COUNT(DISTINCT "LogID") AS distinct_logid,
       COUNT("LogID") AS non_null_logid
FROM "Report";
```

## 8. Merge

Safe any time after step 5 looks right — the schema change already landed in
step 4 (there's no separate prod deploy step where code and schema could get
out of sync, since it's all one database). Step 6's prod data wipe/reload can
happen before or after the merge; it doesn't gate on it.
