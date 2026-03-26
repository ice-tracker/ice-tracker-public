import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const pois = await prisma.place_Of_Interest.findMany();
    return NextResponse.json(pois, { status: 200 });
  } catch (error: any) {
    console.error("ERROR fetching POIs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ReportModel = prisma.place_Of_Interest;

  try {
    const body = await req.json();
    console.log("BODY:", body);
    const { Name, Address, Latitude, Longitude } = body;

    // Validate required fields
    if (
      !Name ||
      !Address ||
      Latitude === undefined ||
      Longitude === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    let existing;

    existing = await prisma.place_Of_Interest.findFirst({
      where: {
        Name,
        Address,
        Latitude,
        Longitude,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Duplicate report exists" },
        { status: 409 },
      );
    }

    // Create entry
    const created = await ReportModel.create({
      data: {
        Name,
        Address,
        Latitude,
        Longitude,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 },
    );
  }
}
