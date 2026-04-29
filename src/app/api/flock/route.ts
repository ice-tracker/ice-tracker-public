import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const cameras = await prisma.flock_Camera.findMany();
    return NextResponse.json(cameras, { status: 200 });
  } catch (error: any) {
    console.error("ERROR fetching Flock cameras:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { Latitude, Longitude, Manufacturer, Operator } = body;

    // Validate required fields for the Flock_Camera model
    if (
      Latitude === undefined ||
      Longitude === undefined ||
      !Manufacturer ||
      !Operator
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: Latitude, Longitude, Manufacturer, or Operator",
        },
        { status: 400 },
      );
    }

    // Check for existing camera at this exact location with this manufacturer
    const existing = await prisma.flock_Camera.findFirst({
      where: {
        Latitude,
        Longitude,
        Manufacturer,
        Operator,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Duplicate camera entry exists" },
        { status: 409 },
      );
    }

    // Create entry in the Flock_Camera table
    const created = await prisma.flock_Camera.create({
      data: {
        Latitude,
        Longitude,
        Manufacturer,
        Operator,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("DATABASE ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
