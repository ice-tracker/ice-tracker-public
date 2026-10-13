/**
 * Cleans the U.S. Census Bureau sub-county population estimates into two flat
 * CSVs keyed the way the rest of this app keys places: UPPERCASE names that
 * match `public/files/towns.json` (TOWN / COUNTY), which is what `filterTown`
 * and `filterCounty` carry.
 *
 * Input:  data/city_subestimate.csv  (Census SUB-EST vintage file)
 * Output: data/census_city_<year>.csv    — 351 MA municipalities
 *         data/census_county_<year>.csv  — 14 MA counties
 *
 * Note the input file's two useful summary levels:
 *   SUMLEV=050 -> counties
 *   SUMLEV=061 -> county subdivisions, i.e. all 351 MA cities AND towns
 * SUMLEV=162 (incorporated places) is deliberately NOT used: it covers only the
 * 58 legal cities, which would leave 293 towns with no population.
 *
 * `data/county_subestimate.csv` is not read. Despite its name it holds no county
 * rows at all — it is the incorporated-places table in Census's "pretty" export
 * format, and is a strict subset of the file above.
 *
 * Usage: node prisma/scripts/clean_census_csv.cjs [-Year 2025] [-InputFile path] [-OutputDir data]
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

function parseArgs(argv) {
  const result = {};

  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key || !key.startsWith("-")) {
      continue;
    }

    result[key.slice(1)] = value;
  }

  return result;
}

// "Agawam Town city" -> AGAWAM, "Boston city" -> BOSTON, "Bourne town" -> BOURNE.
// Census names towns that reincorporated as cities "<Name> Town city", so the
// two-word suffix has to be stripped before the one-word ones.
function normalizeMuni(name) {
  return String(name).replace(/\s+(Town city|city|town)$/, "").trim().toUpperCase();
}

// "Barnstable County" -> BARNSTABLE. towns.json stores counties without the suffix.
function normalizeCounty(name) {
  return String(name).replace(/\s+County$/, "").trim().toUpperCase();
}

function readTownBoundaries(repoRoot) {
  const geoPath = path.join(repoRoot, "public", "files", "towns.json");
  const geo = JSON.parse(fs.readFileSync(geoPath, "utf8"));

  const byTown = {};
  for (const feature of geo.features) {
    const props = feature.properties || {};
    const town = String(props.TOWN || "").toUpperCase();
    if (!town) continue;
    byTown[town] = {
      county: String(props.COUNTY || "").toUpperCase(),
      fips: Number(props.FIPS_STCO),
    };
  }

  return byTown;
}

function main() {
  const args = parseArgs(process.argv);
  const year = Number(args.Year || 2025);
  const repoRoot = path.resolve(__dirname, "..", "..");
  const inputFile = args.InputFile
    ? path.resolve(args.InputFile)
    : path.join(repoRoot, "data", "city_subestimate.csv");
  const outputDir = args.OutputDir
    ? path.resolve(args.OutputDir)
    : path.join(repoRoot, "data");

  const popColumn = `POPESTIMATE${year}`;

  // Not committed (see /data/*.csv in .gitignore), so a fresh clone will not
  // have it. Point at the download rather than failing with a bare ENOENT.
  if (!fs.existsSync(inputFile)) {
    // A template literal with real line breaks, so the message needs no escapes.
    throw new Error(
      `Missing ${inputFile}
The Census SUB-EST file is not committed. Download it and save it there:
  https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025_25.csv`,
    );
  }

  const parsed = Papa.parse(fs.readFileSync(inputFile, "utf8").trim(), {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    throw new Error(
      `Failed to parse ${inputFile}: ${parsed.errors[0].message} (row ${parsed.errors[0].row})`,
    );
  }
  if (!parsed.meta.fields.includes(popColumn)) {
    throw new Error(
      `${inputFile} has no ${popColumn} column. Available: ${parsed.meta.fields.join(", ")}`,
    );
  }

  const rows = parsed.data;
  const townBoundaries = readTownBoundaries(repoRoot);

  // The geo file is the authority for a town's county, so the census data lands
  // pre-joined to the same mapping the UI already filters by.
  const cities = rows
    .filter((row) => row.SUMLEV === "061")
    .map((row) => {
      const city = normalizeMuni(row.NAME);
      const geo = townBoundaries[city];
      return {
        City: city,
        County: geo ? geo.county : "",
        CountyFips: Number(String(row.STATE) + String(row.COUNTY)),
        Year: year,
        Population: Number(row[popColumn]),
        _censusName: row.NAME,
        _geoFips: geo ? geo.fips : null,
      };
    })
    .sort((a, b) => a.City.localeCompare(b.City));

  const counties = rows
    .filter((row) => row.SUMLEV === "050")
    .map((row) => ({
      County: normalizeCounty(row.NAME),
      CountyFips: Number(String(row.STATE) + String(row.COUNTY)),
      Year: year,
      Population: Number(row[popColumn]),
    }))
    .sort((a, b) => a.County.localeCompare(b.County));

  // ---- Integrity checks. A failure here means a future Census vintage changed
  // shape; writing partial data would silently corrupt the map, so bail instead.
  const problems = [];

  if (cities.length !== 351) {
    problems.push(`Expected 351 municipality rows (SUMLEV=061), got ${cities.length}`);
  }
  if (counties.length !== 14) {
    problems.push(`Expected 14 county rows (SUMLEV=050), got ${counties.length}`);
  }

  const unmatched = cities.filter((c) => !townBoundaries[c.City]);
  if (unmatched.length) {
    problems.push(
      `${unmatched.length} municipality name(s) not found in towns.json:\n` +
        unmatched.map((c) => `    "${c._censusName}" -> ${c.City}`).join("\n"),
    );
  }

  const fipsConflicts = cities.filter(
    (c) => c._geoFips !== null && c._geoFips !== c.CountyFips,
  );
  if (fipsConflicts.length) {
    problems.push(
      `${fipsConflicts.length} municipality/county FIPS conflict(s):\n` +
        fipsConflicts
          .map((c) => `    ${c.City}: census=${c.CountyFips} towns.json=${c._geoFips}`)
          .join("\n"),
    );
  }

  const cityTotalsByCounty = {};
  for (const c of cities) {
    cityTotalsByCounty[c.County] = (cityTotalsByCounty[c.County] || 0) + c.Population;
  }
  for (const county of counties) {
    const summed = cityTotalsByCounty[county.County];
    if (summed !== county.Population) {
      problems.push(
        `${county.County} does not reconcile: municipalities sum to ${summed}, county row says ${county.Population}`,
      );
    }
  }

  const badPopulations = [...cities, ...counties].filter(
    (r) => !Number.isFinite(r.Population) || r.Population <= 0,
  );
  if (badPopulations.length) {
    problems.push(
      `${badPopulations.length} row(s) with a missing or non-positive population: ` +
        badPopulations.map((r) => r.City || r.County).join(", "),
    );
  }

  if (problems.length) {
    console.error(`Refusing to write ${outputDir} — integrity checks failed:\n`);
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }

  // ---- Write
  fs.mkdirSync(outputDir, { recursive: true });

  const cityColumns = ["City", "County", "CountyFips", "Year", "Population"];
  const countyColumns = ["County", "CountyFips", "Year", "Population"];

  const cityPath = path.join(outputDir, `census_city_${year}.csv`);
  const countyPath = path.join(outputDir, `census_county_${year}.csv`);

  fs.writeFileSync(
    cityPath,
    Papa.unparse(cities, { columns: cityColumns, newline: "\n" }) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    countyPath,
    Papa.unparse(counties, { columns: countyColumns, newline: "\n" }) + "\n",
    "utf8",
  );

  const statewide = counties.reduce((sum, c) => sum + c.Population, 0);
  console.log(`All integrity checks passed for vintage ${year}.`);
  console.log(`  ${cities.length} municipalities -> ${cityPath}`);
  console.log(`  ${counties.length} counties      -> ${countyPath}`);
  console.log(`  Statewide population: ${statewide.toLocaleString()}`);
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error ? error.stack || error.message : String(error),
  );
  process.exit(1);
}
