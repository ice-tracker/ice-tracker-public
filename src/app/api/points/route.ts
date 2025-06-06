import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Handles GET requests to fetch verified reports.A JSON response containing the reports or an error message.
export async function GET() {
  try {
    const reports = await prisma.report.findMany();

    const offset: number = 0.25; // Offset in miles

    // Randomize secure points by offset
    reports.forEach(
      (point: { Latitude: number; Longitude: number; Sec: boolean }) => {
        if (point.Sec === true) {
          point.Latitude =
            point.Latitude + (Math.random() - 0.5) * 2 * (offset / 69);
          point.Longitude =
            point.Longitude + (Math.random() - 0.5) * 2 * (offset / 69);
        }
      }
    );

    return NextResponse.json(reports, { status: 200 });
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
