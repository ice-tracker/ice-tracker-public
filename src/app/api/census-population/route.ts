import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/census-population
 *
 * U.S. Census Bureau population estimates for every MA municipality (351) and
 * county (14), keyed by UPPERCASE name so callers can look up a `filterTown` /
 * `filterCounty` value directly with no normalization.
 *
 * Returns the newest vintage present in the database, so loading a future
 * vintage needs no code change here. The whole payload is ~365 entries, small
 * enough to fetch once and hold in state — the same approach /api/town-stats
 * takes.
 */
export async function GET() {
  try {
    // Counties are the smaller table and both are loaded together, so the newest
    // year there is the newest year overall.
    const newest = await prisma.census_County_Population.findFirst({
      orderBy: { Year: "desc" },
      select: { Year: true },
    });

    if (!newest) {
      return NextResponse.json(
        { error: "No census population data loaded" },
        { status: 404 },
      );
    }

    const year = newest.Year;

    const [cityRows, countyRows] = await Promise.all([
      prisma.census_City_Population.findMany({
        where: { Year: year },
        select: { City: true, Population: true },
      }),
      prisma.census_County_Population.findMany({
        where: { Year: year },
        select: { County: true, Population: true },
      }),
    ]);

    const cities: Record<string, number> = {};
    for (const row of cityRows) {
      cities[row.City] = row.Population;
    }

    const counties: Record<string, number> = {};
    for (const row of countyRows) {
      counties[row.County] = row.Population;
    }

    return NextResponse.json({ year, cities, counties });
  } catch (error) {
    console.error("Error fetching census population:", error);
    return NextResponse.json(
      { error: "Failed to fetch census population" },
      { status: 500 },
    );
  }
}
