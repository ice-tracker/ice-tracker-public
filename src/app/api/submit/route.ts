import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  MIN_POPULATION,
  isSensitiveLocation,
  processPoint,
} from "@/lib/server/anonymization";
import { getOptionalActor } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";

const prisma = new PrismaClient();

// async function getCensusTract(lat: number, lng: number) {
//   const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
//   const res = await axios.get(url);
//   const geo = res.data.result.geographies['Census Tracts'][0];
//   return {
//     state: geo.STATE,
//     county: geo.COUNTY,
//     tract: geo.TRACT,
//   };
// }


function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Use tract info to get demographic data
// async function getCensusData({ state, county, tract }: { state: string; county: string; tract: string; }) {
//   const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,B19013_001E&for=tract:${tract}&in=state:${state}+county:${county}`;
//   const res = await axios.get(url);
//   const [headers, values] = res.data;
//   const data = Object.fromEntries(headers.map((h: string, i: number) => [h, values[i]]));
//   return data;
// }

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type")?.toLowerCase();
  const useTestTable = process.env.USE_TEST_TABLE === "true";
  const ReportModel = useTestTable ? prisma.test_Report : prisma.report;
  const resource = useTestTable ? "test_report" : "report";

  console.log("TYPE:", type); // 🔍 Log the type

  const { userId: actorId } = await getOptionalActor();

  try {
    const body = await req.json();
    console.log("BODY:", body); // 🔍 Log the payload

    if (type === "report") {
      const {
        Date,
        Latitude,
        Longitude,
        Desc,
        Address,
        synthetic,
        Location,
        Activity,
        Time,
        Agents,
        Cars,
        Tactic,
        NumAbducted,
        OnlyStreet,
        StreetGeom,
        City,
        CreatedBy,
        batchId,
        source,
      } = body;

      // Validate required fields
      if (!Date || Latitude === undefined || Longitude === undefined) {
        return NextResponse.json(
          { success: false, error: "Missing required fields" },
          { status: 400 }
        );
      }

      let existing;

      if (useTestTable) {
        existing = await prisma.test_Report.findFirst({
          where: {
            Date,
            Latitude,
            Longitude,
            Location,
          },
        });
      } else {
        existing = await prisma.report.findFirst({
          where: {
            Date,
            Latitude,
            Longitude,
            Location,
          },
        });
      }

      if (existing) {
        
        return NextResponse.json(
          { success: false, error: "Duplicate report exists" },
          { status: 409 }
        );
        
        // Keeping this code if we ever want to change ownership of data.
        /*
         if (useTestTable) {
          await prisma.test_Report.update({
            where: { id: existing.id },
            data: { CreatedBy: CreatedBy || "Other" },
          });
        } else {
          await prisma.report.update({
            where: { id: existing.id },
            data: { CreatedBy: CreatedBy || "Other" },
          });
        }
        return NextResponse.json(
          { success: true, data: existing, updated: true },
          { status: 200 }
        );
        */
      }

      // let censusData = null;
      // try {
      //   const tractInfo = await getCensusTract(Latitude, Longitude);
      //   censusData = await getCensusData(tractInfo);
      //   console.warn(censusData);
      // } catch (e: any) {
      //   console.warn('Census data fetch failed:', e.message);
      // }

      // Check for duplicates
      let potentialMatches;
      if (useTestTable) {
        potentialMatches = await prisma.test_Report.findMany({
          where: {
            Date,
            Location,
          },
        });
      } else {
        potentialMatches = await prisma.report.findMany({
          where: {
            Date,
            Location,
          },
        });
      }

      const checkDist = 0.5; // km threshold
      let relatedID: number | null = null;

      for (const point of potentialMatches) {
        const dist = haversineDistance(
          point.Latitude,
          point.Longitude,
          Latitude,
          Longitude
        );
        if (dist <= checkDist) {
          relatedID = point.RelReportID || point.id;
          break;
        }
      }

      // Point Anonymization
      let RandomLongitude;
      let RandomLatitude;
      let TotalPopulation;
      let Radius;
      if (isSensitiveLocation(Location) && !OnlyStreet) {
        const result = await processPoint(Longitude, Latitude, MIN_POPULATION);

        if (result) {
          RandomLongitude = result.randomLon;
          RandomLatitude = result.randomLat;
          Radius = result.radius;
          TotalPopulation = result.total_population;
        } else {
          // Fallback or error handling
          RandomLongitude = null;
          RandomLatitude = null;
          Radius = null;
          TotalPopulation = null;
        }
      } else {
        RandomLongitude = Longitude;
        RandomLatitude = Latitude;
        Radius = 0;
        TotalPopulation = 0;
      }

      // Create entry

      const created = await ReportModel.create({
        data: {
          Date,
          Latitude,
          Longitude,
          Address,
          Location,
          Activity,
          Time: Time || undefined,
          Sec: isSensitiveLocation(Location),
          Description: Desc || undefined,
          Agents,
          Cars,
          Tactic,
          RelReportID: relatedID,
          NumAbducted: NumAbducted || 0,
          OnlyStreet,
          StreetGeom: StreetGeom || undefined,
          City: City || undefined,
          Radius,
          RandomLongitude,
          RandomLatitude,
          TotalPopulation,
          CreatedBy: CreatedBy || "LUCE",
        },
      });

      if (!relatedID) {
        if (useTestTable) {
          await prisma.test_Report.update({
            where: { id: created.id },
            data: { RelReportID: created.id },
          });
        } else {
          await prisma.report.update({
            where: { id: created.id },
            data: { RelReportID: created.id },
          });
        }
      }

      await writeAuditLog({
        action: "upload",
        resource,
        resourceId: created.id,
        actorId,
        batchId: batchId ?? null,
        source: source ?? "single",
        snapshot: created,
      });

      return NextResponse.json(
        { success: true, data: created },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Unknown type: ${type}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("ERROR:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
