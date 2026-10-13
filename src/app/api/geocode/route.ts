import axios from "axios";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  // Block unauthenticated requests
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return new Response(JSON.stringify({ error: "Address is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const API_KEY = process.env.GMAPS_API_KEY;
  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: API key missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Failed to fetch geocode" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
