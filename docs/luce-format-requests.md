# Format Feedback for Luce — Upload Sheet

Based on building the importer for `data/2026.07.22_Data_Sample.xlsx`, the
current format is workable (the importer tolerates it as-is — see
`src/components/forms/BulkUploadComponent.tsx`), but a few changes to the
*next* revision of the export would remove ambiguity and reduce the amount of
best-effort inference the importer has to do. None of these block the current
migration; they're asks for the next iteration of the sheet.

## 1. Split `LatLong` into separate `Latitude` / `Longitude` columns

The current sheet packs both coordinates into one cell (`"42.3600, -71.1830"`)
or leaves it entirely blank when only an `Address` is given. Splitting this
into two columns removes a layer of string-parsing (and the associated risk
of a malformed cell like `"42.3600 -71.1830"` or `"42.3600; -71.1830"`
silently failing to split) on our end, and makes the sheet directly usable in
tools like Excel/Sheets for basic mapping without a formula.

## 2. Split `Incident Description` into a type column + a numeric count column

Today one cell carries both the incident type and (for abductions) a count,
as free text: `"Confirmed Sighting"` or `"Confirmed Abducted: 2"`. We parse
this with a regex (`parseIncidentDescription` in `src/constants/incident.ts`),
which works for the patterns seen in the sample but is brittle to phrasing
drift (e.g. `"Abduction confirmed - 2 people"` would not match). Two columns
— `Incident Type` (`Sighting` / `Abduction`) and `Number Taken` (integer,
blank/0 for sightings) — would let us drop the regex entirely.

## 3. Use real blank cells instead of the literal string `"(empty)"`

Several columns (`Time`, `Address`, `LatLong`) use the literal text `(empty)`
to mean "no value," rather than leaving the cell blank. We normalize this
(`emptyToNull` in `src/constants/incident.ts`), but it's a workaround — a
genuinely blank cell is what every spreadsheet tool and CSV parser already
understands as "no value," so this removes a step and a class of bugs (e.g.
a future export accidentally using `"(Empty)"`, `"n/a"`, or `""` inconsistently).

## 4. Add a dedicated `City` / `Town` column

The new format dropped the standalone `City` column that the previous export
had. We derive a best-effort city from parsing the `Address` string
(`extractCityFromAddress` in `BulkUploadComponent.tsx`), but this has a real
gap: rows that have a `LatLong` value and **no** `Address` text at all (which
the sample sheet includes) have no source string to extract a city from, and
end up with `City` unset. Town-level aggregate statistics (`/statistics`,
`/api/town-stats`) depend on this field, so we'd like it restored as its own
column rather than inferred.

## 5. Confirm `Log ID` is globally unique and stable across re-exports

We use `Log ID` as the idempotency key for bulk re-uploads (a unique DB
constraint — see `docs/luce-migration.md`): re-uploading the same sheet, or
the same row appearing in two different sheets, should always be recognized
as the same report rather than creating a duplicate. This only works if:
- every `Log ID` is unique within a sheet (no two rows share one), and
- a given incident's `Log ID` never changes across different exports/revisions
  of "the same" data.

Could you confirm both hold for how `Log ID`s are generated on your end?

## 6. Optional: ISO 8601 dates instead of Excel serials

`Date` currently arrives as an Excel serial number (e.g. `45781`) with no
number-format metadata on the cell to hint at that (confirmed via the
sheet's `styles.xml` — `numFmtId="0"`, i.e. General format). We convert this
correctly today via SheetJS's `SSF.parse_date_code`, but a plain ISO date
string (`2025-05-04`) would be human-readable directly in the sheet and
removes any dependency on Excel's date-serial epoch behaving consistently
across export tools.

## 7. Optional: a free-text `Notes` column

Several other fields the previous manual forms collected (e.g. additional
context about the incident) have no home in the new 7-column format. An
optional `Notes` column would give a place for that without overloading
`Incident Description`.
