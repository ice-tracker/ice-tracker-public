import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createDeterministicRandom,
  MIN_POPULATION,
  processPoint,
} from "@/lib/server/anonymization";

const HIDDEN_ADDRESS = "Hidden for confidentiality";

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
export async function GET() {
  try {
    const query = {
      select: {
        id: true,
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
      },
    };

    const isDev = process.env.NODE_ENV !== "production";
    const reports = isDev
      ? await prisma.test_Report.findMany(query)
      : await prisma.report.findMany(query);

    const processedReports = await Promise.all(
      reports.map(async (report) => {
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

        const anonResult = await processPoint(
          report.Longitude,
          report.Latitude,
          MIN_POPULATION,
          {
            randomFn: deterministicRandom,
            retryDelayMs: 0,
          }
        );

        const safeReport = stripRealCoordinates(report);

        return {
          ...safeReport,
          Sec: true,
          Address: HIDDEN_ADDRESS,
          RandomLatitude: anonResult.randomLat,
          RandomLongitude: anonResult.randomLon,
          Radius: anonResult.radius,
          TotalPopulation: anonResult.total_population,
        };
      })
    );

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
