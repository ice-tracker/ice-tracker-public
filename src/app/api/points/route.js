import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const { db } = await connectToDatabase();

    // Names of mongo collections to be searched
    const collections = ["Sightings", "Unverified", "Verified"];

    try {
      const results = {};

      // Asynch query of collections (Sightings, Unverified, Verified)
      await Promise.all(
        collections.map(async (collection) => {
          const cursor = db.collection(collection).find({}).limit(750);
          results[collection] = [];
          for await (const doc of cursor) {
            results[collection].push(doc);
          }
        })
      );

      return NextResponse.json(results); // Return points as JSON {Sightings:[], Unverified: [], Verified:[]}
    } catch (error) {
      console.error("Error querying collections:", error);
      return NextResponse.json(
        { error: "Failed to fetch data" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching ICE arrests:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
