import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Handles GET requests to fetch verified reports.A JSON response containing the reports or an error message.
export async function GET() {
  try {
    const reports = await prisma.report.findMany();

    const offset: number = 1; // Offset in miles

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

// -------- Old Mongo route -------------
/*

import { NextResponse, NextRequest } from "next/server";
import { Db, Document, FindCursor } from "mongodb"; // Import necessary types from 'mongodb'
import { connectToDatabase } from "@/lib/mongodb";

// Assuming "@/lib/mongodb" exports a function that connects to MongoDB
// and returns an object containing the database instance.
// You might need to adjust the return type of connectToDatabase based on its actual implementation.
interface DbConnection {
  db: Db;
  // Add other properties if connectToDatabase returns more, e.g., client: MongoClient;
}

export async function GET(request: NextRequest) {
  // Added NextRequest type for the request object
  try {
    const { db }: DbConnection = await connectToDatabase();

    // Names of mongo collections to be searched
    const collections: string[] = ["Sightings", "Unverified", "Verified"];

    try {
      // Define the structure of the results object
      const results: Record<string, Document[]> = {};

      // Asynch query of collections (Sightings, Unverified, Verified)
      await Promise.all(
        collections.map(async (collectionName: string) => {
          // Specify the type for the cursor
          const cursor: FindCursor<Document> = db
            .collection(collectionName)
            .find({})
            .limit(750);
          results[collectionName] = [];
          for await (const doc of cursor) {
            results[collectionName].push(doc);
          }
        })
      );

      // Return points as JSON {Sightings:[], Unverified: [], Verified:[]}
      return NextResponse.json(results);
    } catch (error: unknown) {
      // Use 'unknown' for caught errors and narrow down if needed
      console.error("Error querying collections:", error);
      return NextResponse.json(
        { error: "Failed to fetch data" },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    // Use 'unknown' for caught errors
    console.error("Error connecting to database or fetching data:", error); // More generic error message
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
*/
