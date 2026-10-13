/**
 * Loads the cleaned Census population CSVs into Postgres.
 *
 * Input:  data/census_city_<year>.csv, data/census_county_<year>.csv
 *         (produced by prisma/scripts/clean_census_csv.cjs)
 * Output: Census_City_Population, Census_County_Population
 *
 * Idempotent: each table's rows for the given year are replaced wholesale
 * inside a transaction, so re-running changes nothing and a mid-flight failure
 * rolls back rather than leaving the table half-loaded or empty.
 *
 * Usage: node prisma/scripts/import_census.cjs [-Year 2025] [-DataDir data] [-DatabaseUrl ...]
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const { PrismaClient } = require("@prisma/client");

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

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing ${filePath}. Run: node prisma/scripts/clean_census_csv.cjs`,
    );
  }

  const parsed = Papa.parse(fs.readFileSync(filePath, "utf8").trim(), {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    throw new Error(
      `Failed to parse ${filePath}: ${parsed.errors[0].message} (row ${parsed.errors[0].row})`,
    );
  }

  return parsed.data;
}

async function main() {
  const args = parseArgs(process.argv);
  const year = Number(args.Year || 2025);
  const databaseUrl = args.DatabaseUrl || process.env.DATABASE_URL;
  const repoRoot = path.resolve(__dirname, "..", "..");
  const dataDir = args.DataDir ? path.resolve(args.DataDir) : path.join(repoRoot, "data");

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Pass -DatabaseUrl or set DATABASE_URL.",
    );
  }

  process.env.DATABASE_URL = databaseUrl;

  const cities = readCsv(path.join(dataDir, `census_city_${year}.csv`)).map((row) => ({
    City: row.City,
    County: row.County,
    CountyFips: Number(row.CountyFips),
    Year: Number(row.Year),
    Population: Number(row.Population),
  }));

  const counties = readCsv(path.join(dataDir, `census_county_${year}.csv`)).map((row) => ({
    County: row.County,
    CountyFips: Number(row.CountyFips),
    Year: Number(row.Year),
    Population: Number(row.Population),
  }));

  // Guard against loading a file whose Year column disagrees with -Year, which
  // would silently strand rows under a year nothing reads.
  const stray = [...cities, ...counties].filter((row) => row.Year !== year);
  if (stray.length) {
    throw new Error(
      `${stray.length} row(s) have a Year other than ${year}; refusing to load.`,
    );
  }
  if (!cities.length || !counties.length) {
    throw new Error("Refusing to load: one of the CSVs is empty.");
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$transaction([
      prisma.census_City_Population.deleteMany({ where: { Year: year } }),
      prisma.census_City_Population.createMany({ data: cities }),
      prisma.census_County_Population.deleteMany({ where: { Year: year } }),
      prisma.census_County_Population.createMany({ data: counties }),
    ]);

    const [cityCount, countyCount] = await Promise.all([
      prisma.census_City_Population.count({ where: { Year: year } }),
      prisma.census_County_Population.count({ where: { Year: year } }),
    ]);

    console.log(`Loaded Census vintage ${year}:`);
    console.log(`  Census_City_Population:   ${cityCount} rows`);
    console.log(`  Census_County_Population: ${countyCount} rows`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.stack || error.message : String(error),
  );
  process.exit(1);
});
