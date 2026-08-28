import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/auth";
import {
  createDeterministicRandom,
  LEGACY_MISSING_LOCATION_RADIUS_MILES,
  applyFixedRadiusOffset,
} from "@/lib/server/anonymization";

const HIDDEN_ADDRESS = "Hidden for confidentiality";

// The response varies by auth (?includeHidden=true for admins), so it must never
// be cached and replayed to an anonymous visitor.
export const dynamic = "force-dynamic";

function isLegacyMissingLocation(location: string | null | undefined): boolean {
  if (location === null || location === undefined) {
    return true;
  }

  return location.trim().toLowerCase() === "(empty)";
}

function buildDeterministicSeed(
  reportId: number,
  latitude: number,
  longitude: number
): string {
  const salt = process.env.ANONYMIZATION_SEED_SECRET || "default-anonymization";
  return `${salt}:${reportId}:${latitude}:${longitude}`;
}

function stripRealCoordinates<T extends { Latitude: number; Longitude: number }>(
  report: T
): Omit<T, "Latitude" | "Longitude"> {
  const safeReport = { ...report };
  delete (safeReport as { Latitude?: number }).Latitude;
  delete (safeReport as { Longitude?: number }).Longitude;
  return safeReport;
}

// Handles GET requests to fetch verified reports.A JSON response containing the reports or an error message.
//
// Hidden reports (Report.Hidden — flipped by PATCH /api/reports/[id]) are
// filtered out here, in the database query, so they are never serialized at all.
// Signed-in admins can ask for them back with ?includeHidden=true, which is
// checked against requireAdmin(); for anyone else the flag is silently ignored
// rather than erroring, so an expired session degrades to the public view
// instead of a broken page.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let includeHidden = false;
    if (searchParams.get("includeHidden") === "true") {
      const admin = await requireAdmin();
      includeHidden = admin.ok;
    }

    const query = {
      select: {
        id: true,
        LogID: true,
        Date: true,
        Latitude: true,
        Longitude: true,
        Time: true,
        Location: true,
        Activity: true,
        Sec: true,
        Description: true,
        Cars: true,
        Tactic: true,
        Address: true,
        RelReportID: true,
        Agents: true,
        Radius: true,
        RandomLatitude: true,
        RandomLongitude: true,
        TotalPopulation: true,
        OnlyStreet: true,
        StreetGeom: true,
        City: true,
        NumAbducted: true,
        Hidden: true,
      },
      ...(includeHidden ? {} : { where: { Hidden: false } }),
    };

    // Table selection uses USE_TEST_TABLE, consistent with the write/admin paths
    // (/api/submit, /api/reports/*) and /api/luce-area-stats — so reads and writes
    // never disagree about which table is live. (Previously keyed off NODE_ENV.)
    const useTestTable = process.env.USE_TEST_TABLE === "true";
    const reports = useTestTable
      ? await prisma.test_Report.findMany(query)
      : await prisma.report.findMany(query);

    const processedReports = reports.map((report) => {
        const shouldAnonymizeLegacy = isLegacyMissingLocation(report.Location);

        if (!shouldAnonymizeLegacy) {
          const safeReport = stripRealCoordinates(report);
          return {
            ...safeReport,
            Address: report.Sec ? HIDDEN_ADDRESS : report.Address,
          };
        }

        const deterministicRandom = createDeterministicRandom(
          buildDeterministicSeed(report.id, report.Latitude, report.Longitude)
        );

        const anonResult = applyFixedRadiusOffset(
          report.Longitude,
          report.Latitude,
          LEGACY_MISSING_LOCATION_RADIUS_MILES,
          deterministicRandom
        );

        const safeReport = stripRealCoordinates(report);

        return {
          ...safeReport,
          Sec: true,
          Address: HIDDEN_ADDRESS,
          RandomLatitude: anonResult.randomLat,
          RandomLongitude: anonResult.randomLon,
          Radius: anonResult.radius,
          TotalPopulation: 0,
        };
    });

    return NextResponse.json(processedReports, { status: 200 });
  } catch (error) {
    // Error handling
    console.error("Error fetching reports:", error);

    if (error instanceof Error) {
      return new NextResponse(
        JSON.stringify({
          message: "Failed to fetch reports due to a server error.",
          error: error.message, // Exposing error.message for debugging. Consider removing in production.
        }),
        {
          status: 500, // HTTP status code for Internal Server Error
          headers: {
            "Content-Type": "application/json", // Ensure the client knows the response is JSON
          },
        }
      );
    } else {
      return new NextResponse(
        JSON.stringify({
          message: "An unknown error occurred while processing your request.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }
}
