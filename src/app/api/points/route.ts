import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Handles GET requests to fetch verified reports.A JSON response containing the reports or an error message.
export async function GET() {
  try {
    const query = {
      select: {
        id: true,
        Date: true,
        //do not project real lat/lon
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

    // If secure, don't show address
    const processedReports = reports.map((report) => ({
      ...report,
      Address: report.Sec ? "Hidden for confidentiality" : report.Address,
    }));

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
