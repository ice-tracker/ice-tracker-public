import { NextResponse, NextRequest } from "next/server";
import { MongoClient, Db, Collection, ObjectId, Document } from "mongodb";

// Declare environment variable for MongoDB URI
const uri: string | undefined = process.env.MONGO_URI;

// Initialize MongoClient and Db instances outside the function to reuse them
let client: MongoClient | undefined;
let db: Db | undefined;

/**
 * Connects to the MongoDB database.
 * If a client connection already exists, it reuses it.
 * Otherwise, it creates a new connection.
 * @returns {Promise<Db>} The MongoDB database instance.
 */
async function connectToDatabase(): Promise<Db> {
  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables.");
  }

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db("ICE"); // Use the correct database name
  }
  // Ensure db is not undefined before returning
  if (!db) {
    throw new Error("Failed to connect to the database.");
  }
  return db;
}

/**
 * Counts the number of events that occurred since a specific date.
 * @param {Date} date - The cutoff date. Events on or after this date will be counted.
 * @param {Document} eventData - The document containing event data, expected to have an 'ice_arrests' array.
 * @returns {number} The count of events since the specified date.
 */
function countEventsSince(date: Date, eventData: Document): number {
  // Ensure eventData.ice_arrests is an array before filtering
  if (!Array.isArray(eventData.ice_arrests)) {
    console.warn("eventData.ice_arrests is not an array or is missing.");
    return 0;
  }

  return eventData.ice_arrests.filter((event: any) => {
    // 'any' used for event structure as it's not strictly defined
    // Assuming 'event.Date' is a string in "YYYY-MM-DD" format
    if (typeof event.Date !== "string") {
      console.warn("Event 'Date' is not a string:", event);
      return false;
    }

    const myDateParts = event.Date.split("-");
    if (myDateParts.length !== 3) {
      console.warn("Event 'Date' format is incorrect:", event.Date);
      return false;
    }

    const year = Number(myDateParts[0]);
    const month = Number(myDateParts[1]) - 1; // Month is 0-indexed in JavaScript Date
    const day = Number(myDateParts[2]);

    // Basic validation for date parts
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn("Invalid date parts in event:", event.Date);
      return false;
    }

    const newDate = new Date(year, month, day);
    return newDate.getTime() >= date.getTime(); // Compare timestamps for accuracy
  }).length;
}

/**
 * Handles GET requests to fetch ICE arrest event data.
 * Retrieves event counts for total, past 24 hours, and past week.
 * @param {NextRequest} request - The Next.js request object.
 * @returns {Promise<NextResponse>} A JSON response containing event counts or an error message.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const db: Db = await connectToDatabase();
    const collection: Collection<Document> = db.collection("Events");

    // Define the expected structure of the event data document
    interface IceArrestEvent {
      Date: string; // Assuming "YYYY-MM-DD"
      // Add other properties of an event if known
    }

    interface EventDocument extends Document {
      ice_arrests?: IceArrestEvent[]; // Optional array of ICE arrest events
    }

    const eventData: EventDocument | null = await collection.findOne({
      _id: new ObjectId("67ba4b28876839722173788b"),
    });
 
    if (!eventData || !Array.isArray(eventData.ice_arrests)) {
      return NextResponse.json(
        { message: "No data found or 'ice_arrests' is missing/invalid" },
        { status: 404 }
      );
    }

    const now: Date = new Date();
    const past24hrs: Date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const pastWeek: Date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalEvents: number = eventData.ice_arrests.length;
    const past24hrsEvents: number = countEventsSince(past24hrs, eventData);
    const pastWeekEvents: number = countEventsSince(pastWeek, eventData);

    return NextResponse.json({ totalEvents, past24hrsEvents, pastWeekEvents });
  } catch (error: unknown) {
    console.error("Error fetching ICE events:", error);
    // Provide a more specific error message if possible
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
