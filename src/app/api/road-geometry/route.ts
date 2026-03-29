import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const streetName = searchParams.get("streetName");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!streetName || !lat || !lng) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const overpassQuery = `
    [out:json][timeout:25];
    (
      way["highway"]["name"~"${streetName}",i](${+lat - 0.01},${+lng - 0.01},${+lat + 0.01},${+lng + 0.01});
    );
    out geom;
  `;

  try {
    const response = await axios.post(
      "https://overpass-api.de/api/interpreter",
      overpassQuery,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error fetching from Overpass:", error.message);
    return NextResponse.json({ error: "Failed to fetch geometry" }, { status: 500 });
  }
}