import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

export async function POST(req) {
  let client;
  try {

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json({ error: "Type is missing" }, { status: 400 });
    }
    
    // Ensure MongoDB URI is set
    const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error("MongoDB URI is missing!");
      return NextResponse.json({ error: "MongoDB URI is missing" }, { status: 500 });
    }
    //json
    const formData = await req.json();
    if (!formData || typeof formData !== 'object' || !formData.Address) {
      console.error("Invalid form data received:", formData);
      return NextResponse.json({ error: "Invalid form data received" }, { status: 400 }); // Bad Request
  }


    // mongodb
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db("ICE");
    let collection;
    if(type == 1){
      collection = db.collection("Verified");
    }else if(type == 2){
      collection = db.collection("Unverified")
    }else{
      collection = db.collection("Sightings")
    }
    
    // chec if the document already exists
    const existing = await collection.findOne(formData);
    if (existing) {
      console.log("Document already exists:", existing);
      return NextResponse.json({ message: "Document already exists" }, { status: 409 }); // Conflict
    }
    // Push the formData into the ice_arrests array
    const updateResult = await collection.insertOne(
      formData
    );

    return NextResponse.json({ message: "Form submitted successfully", updateResult }, { status: 201 });

  } catch (error) {
    console.error("Error saving form data:", error);
    return NextResponse.json({ error: "Failed to submit form", details: error.message }, { status: 500 });

  } finally {
    if (client) await client.close(); // Ensure connection is always closed
  }
}